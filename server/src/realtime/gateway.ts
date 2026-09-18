import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Config } from "../config/index.js";
import { canAccessThread, type Principal } from "../auth/roles.js";
import { bearer, verifyAccessToken } from "../auth/tokens.js";
import type { Repository } from "../db/repository.js";
import type { Attachment } from "../db/types.js";
import { logger } from "../lib/logger.js";
import type { ObjectStore } from "../storage/objectStore.js";
import { PresenceTracker } from "./presence.js";
import {
  threadRoom,
  userRoom,
  type ClientToServer,
  type SerializedMessage,
  type ServerToClient,
} from "./protocol.js";

/** Attachments staged by the REST upload, claimed once by `message:send`. */
export interface AttachmentStaging {
  take(id: string, ownerId: string): Attachment | null;
  put(id: string, ownerId: string, attachment: Attachment): void;
}

export interface GatewayDeps {
  config: Config;
  repo: Repository;
  store: ObjectStore;
  staging: AttachmentStaging;
  presence?: PresenceTracker;
}

type AppSocket = Socket<ClientToServer, ServerToClient> & { data: { principal: Principal } };

/**
 * Consultation gateway.
 *
 * Room isolation is the security boundary: a socket is only ever added to
 * `thread:<id>` after `canAccessThread` passes, so a broadcast physically
 * cannot reach a participant who is not in the consultation.
 */
export function createGateway(httpServer: HttpServer, deps: GatewayDeps) {
  const presence = deps.presence ?? new PresenceTracker();

  const io = new Server<ClientToServer, ServerToClient>(httpServer, {
    cors: { origin: deps.config.corsOrigins, credentials: true },
    // Engine-level liveness. A half-open mobile connection is reaped in ~45s
    // rather than lingering as a phantom "online" participant.
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e6, // payloads are JSON; files go over REST
    transports: ["websocket", "polling"],
  });

  /* ------------------------------ handshake ------------------------------ */

  io.use((socket, next) => {
    const raw =
      bearer(socket.handshake.headers.authorization) ??
      (socket.handshake.auth?.token as string | undefined);
    if (!raw) return next(new Error("unauthorized"));
    try {
      (socket as AppSocket).data.principal = verifyAccessToken(deps.config, raw);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const s = socket as AppSocket;
    const principal = s.data.principal;
    const log = logger.child({ socket: socket.id, user: principal.sub, role: principal.role });

    void socket.join(userRoom(principal.sub));

    const cameOnline = presence.add(principal.sub, socket.id);
    log.debug({ cameOnline }, "socket connected");

    socket.emit("connection:ready", {
      userId: principal.sub,
      role: principal.role,
      serverTime: new Date().toISOString(),
    });

    if (cameOnline) void announcePresence(principal.sub, true);

    /* -------------------------------- rooms ------------------------------- */

    socket.on("thread:join", async ({ threadId }, ack) => {
      if (!canAccessThread(principal, threadId)) {
        ack?.({ ok: false, code: "forbidden", message: "به این گفتگو دسترسی ندارید." });
        return;
      }
      await socket.join(threadRoom(threadId));

      // Everything the joiner missed while away is already delivered.
      const page = await deps.repo.listMessages(threadId, { limit: 1 });
      const newest = page.items[0];
      if (newest) {
        await deps.repo.markDelivered(threadId, newest.seq, principal.sub);
      }

      // Tell the joiner who else is in the room right now.
      const thread = await deps.repo.getThread(threadId);
      if (thread) {
        const other = thread.clientId === principal.sub ? thread.specialistId : thread.clientId;
        socket.emit("presence", {
          threadId,
          userId: other,
          online: presence.isOnline(other),
          lastSeen: presence.lastSeenAt(other),
        });
      }

      ack?.({ ok: true });
    });

    socket.on("thread:leave", ({ threadId }) => {
      void socket.leave(threadRoom(threadId));
    });

    /* ------------------------------- messages ----------------------------- */

    socket.on("message:send", async ({ threadId, clientId, text, attachmentId }, ack) => {
      try {
        if (!canAccessThread(principal, threadId)) {
          ack?.({ ok: false, code: "forbidden", message: "به این گفتگو دسترسی ندارید." });
          return;
        }
        const body = typeof text === "string" ? text.trim() : undefined;
        if (!body && !attachmentId) {
          ack?.({ ok: false, code: "empty", message: "پیام خالی است." });
          return;
        }
        if (body && body.length > 4000) {
          ack?.({ ok: false, code: "too_long", message: "پیام بیش از حد طولانی است." });
          return;
        }

        // An attachment may only be attached by the account that uploaded it,
        // and only once — the staging entry is consumed here.
        let attachment: Attachment | undefined;
        if (attachmentId) {
          const claimed = deps.staging.take(attachmentId, principal.sub);
          if (!claimed) {
            ack?.({ ok: false, code: "bad_attachment", message: "پیوست نامعتبر یا منقضی است." });
            return;
          }
          attachment = claimed;
        }

        const message = await deps.repo.appendMessage({
          threadId,
          authorId: principal.sub,
          text: body,
          attachment,
        });
        const serialized = await serialize(message);

        ack?.({ ok: true, message: serialized });
        socket.emit("message:ack", {
          clientId,
          id: message.id,
          seq: message.seq,
          status: "sent",
        });

        // Everyone else in the room, then a delivered ack if anyone heard it.
        socket.to(threadRoom(threadId)).emit("message:new", { message: serialized });

        const room = await io.in(threadRoom(threadId)).fetchSockets();
        const others = room.filter((r) => r.id !== socket.id);
        if (others.length > 0) {
          await deps.repo.markDelivered(threadId, message.seq, principal.sub);
          socket.emit("message:ack", {
            clientId,
            id: message.id,
            seq: message.seq,
            status: "delivered",
          });
        }
      } catch (error) {
        log.error({ err: error }, "message:send failed");
        ack?.({ ok: false, code: "internal_error", message: "ارسال پیام ناموفق بود." });
      }
    });

    /* -------------------------------- typing ------------------------------ */

    const emitTyping = (threadId: string, active: boolean) => {
      if (!canAccessThread(principal, threadId)) return;
      socket.to(threadRoom(threadId)).emit("typing", {
        threadId,
        userId: principal.sub,
        name: principal.name,
        active,
      });
    };

    socket.on("typing:start", ({ threadId }) => emitTyping(threadId, true));
    socket.on("typing:stop", ({ threadId }) => emitTyping(threadId, false));

    /* ------------------------------- receipts ----------------------------- */

    socket.on("read:ack", async ({ threadId, upToSeq }) => {
      if (!canAccessThread(principal, threadId)) return;
      const changed = await deps.repo.markRead(threadId, principal.sub, upToSeq);
      if (changed === 0) return;
      socket.to(threadRoom(threadId)).emit("read", {
        threadId,
        userId: principal.sub,
        upToSeq,
      });
    });

    /* ------------------------------ heartbeat ----------------------------- */

    // Engine.io already pings; this is the application-level probe the client
    // uses to show a live latency/offline badge.
    socket.on("heartbeat:ping", ({ at }, ack) => {
      ack?.({ at, serverAt: Date.now() });
    });

    /* ----------------------------- disconnect ----------------------------- */

    socket.on("disconnect", (reason) => {
      const wentOffline = presence.remove(principal.sub, socket.id);
      log.debug({ reason, wentOffline }, "socket disconnected");
      if (wentOffline) void announcePresence(principal.sub, false);
    });

    /* ------------------------------- helpers ------------------------------ */

    async function announcePresence(userId: string, online: boolean) {
      const threads = await deps.repo.listThreadsFor(userId);
      const payload = { userId, online, lastSeen: presence.lastSeenAt(userId) };
      for (const thread of threads) {
        io.to(threadRoom(thread.id)).emit("presence", { threadId: thread.id, ...payload });
      }
    }
  });

  async function serialize(message: {
    id: string;
    threadId: string;
    authorId: string;
    text?: string;
    seq: number;
    createdAt: string;
    status: "sent" | "delivered" | "read";
    attachment?: Attachment;
  }): Promise<SerializedMessage> {
    return {
      id: message.id,
      threadId: message.threadId,
      authorId: message.authorId,
      text: message.text,
      seq: message.seq,
      createdAt: message.createdAt,
      status: message.status,
      attachment: message.attachment
        ? {
            id: message.attachment.id,
            kind: message.attachment.kind,
            name: message.attachment.name,
            sizeBytes: message.attachment.sizeBytes,
            mime: message.attachment.mime,
            durationSec: message.attachment.durationSec,
            url: await deps.store.presignGet(message.attachment.key, {
              filename: message.attachment.name,
            }),
          }
        : undefined,
    };
  }

  return { io, presence, serialize };
}
