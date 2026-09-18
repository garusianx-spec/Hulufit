import type { Message } from "../db/types.js";

/**
 * The consultation wire protocol.
 *
 * Kept in one file and exported so the web client can import the same shapes —
 * a change here is a compile error on both sides rather than a runtime mismatch.
 */

export interface ClientToServer {
  "thread:join": (p: { threadId: string }, ack?: (r: AckResult) => void) => void;
  "thread:leave": (p: { threadId: string }) => void;

  "message:send": (
    p: { threadId: string; clientId: string; text?: string; attachmentId?: string },
    ack?: (r: AckResult<{ message: SerializedMessage }>) => void,
  ) => void;

  "typing:start": (p: { threadId: string }) => void;
  "typing:stop": (p: { threadId: string }) => void;

  "read:ack": (p: { threadId: string; upToSeq: number }) => void;

  /** Client-side liveness probe; the server replies with the same nonce. */
  "heartbeat:ping": (p: { at: number }, ack?: (r: { at: number; serverAt: number }) => void) => void;
}

export interface ServerToClient {
  "connection:ready": (p: { userId: string; role: string; serverTime: string }) => void;
  "message:new": (p: { message: SerializedMessage }) => void;
  "message:ack": (p: {
    clientId: string;
    id: string;
    seq: number;
    status: "sent" | "delivered" | "read";
  }) => void;
  "typing": (p: { threadId: string; userId: string; name: string; active: boolean }) => void;
  "read": (p: { threadId: string; userId: string; upToSeq: number }) => void;
  "presence": (p: { threadId: string; userId: string; online: boolean; lastSeen: string }) => void;
  "error": (p: { code: string; message: string }) => void;
}

export type AckResult<T = unknown> =
  | ({ ok: true } & Partial<T>)
  | { ok: false; code: string; message: string };

export interface SerializedMessage {
  id: string;
  threadId: string;
  authorId: string;
  text?: string;
  seq: number;
  createdAt: string;
  status: Message["status"];
  attachment?: {
    id: string;
    kind: string;
    name: string;
    sizeBytes: number;
    mime: string;
    /** Presigned; short-lived by design. Re-fetch from history when it expires. */
    url: string;
    durationSec?: number;
  };
}

/** Socket.io room name for a consultation. Isolation is per thread. */
export const threadRoom = (threadId: string) => `thread:${threadId}`;
/** Per-user room, for presence fan-out and targeted pushes. */
export const userRoom = (userId: string) => `user:${userId}`;
