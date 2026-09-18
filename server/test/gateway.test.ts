import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { io as connect, type Socket } from "socket.io-client";
import { PNG_1PX, PDF_TINY, devToken, multipart, startHarness, type Harness } from "./helpers.js";

let h: Harness;

const open = (token: string): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = connect(h.baseUrl, { auth: { token }, transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });

const once = <T>(socket: Socket, event: string, ms = 4000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

before(async () => {
  h = await startHarness();
});
after(async () => {
  await h.close();
});

describe("auth & RBAC", () => {
  it("rejects a socket with no token", async () => {
    await assert.rejects(
      () =>
        new Promise((resolve, reject) => {
          const s = connect(h.baseUrl, { transports: ["websocket"] });
          s.on("connect", () => resolve(s));
          s.on("connect_error", reject);
        }),
      /unauthorized/,
    );
  });

  it("refuses history for a thread the principal is not in", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_9", role: "client", threads: [] });
    const res = await fetch(`${h.baseUrl}/api/v1/threads/th_1/messages`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });

  it("refuses admin analytics to a specialist", async () => {
    const token = await devToken(h.baseUrl, { userId: "sp_1", role: "specialist", threads: ["th_1"] });
    const res = await fetch(`${h.baseUrl}/api/v1/admin/overview`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });

  it("allows admin analytics to an admin", async () => {
    const token = await devToken(h.baseUrl, { userId: "admin_1", role: "admin" });
    const res = await fetch(`${h.baseUrl}/api/v1/admin/overview`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { users: { total: number }; live: { onlineUsers: number } };
    assert.ok(body.users.total > 0);
    assert.equal(typeof body.live.onlineUsers, "number");
  });
});

describe("realtime consultation", () => {
  it("delivers a message, typing and read receipts between the two participants", async () => {
    const clientToken = await devToken(h.baseUrl, { userId: "u_1", role: "client", name: "سارا", threads: ["th_1"] });
    const coachToken = await devToken(h.baseUrl, { userId: "sp_1", role: "specialist", name: "دکتر کیانی", threads: ["th_1"] });

    const client = await open(clientToken);
    const coach = await open(coachToken);

    await new Promise<void>((resolve, reject) =>
      client.emit("thread:join", { threadId: "th_1" }, (r: { ok: boolean }) =>
        r.ok ? resolve() : reject(new Error("client join refused")),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      coach.emit("thread:join", { threadId: "th_1" }, (r: { ok: boolean }) =>
        r.ok ? resolve() : reject(new Error("coach join refused")),
      ),
    );

    // typing indicator reaches the other participant only
    const typing = once<{ userId: string; active: boolean }>(coach, "typing");
    client.emit("typing:start", { threadId: "th_1" });
    assert.deepEqual(await typing, { threadId: "th_1", userId: "u_1", name: "سارا", active: true });

    // message fan-out + staged acks
    const incoming = once<{ message: { text: string; seq: number; id: string } }>(coach, "message:new");
    const ackSent = once<{ status: string }>(client, "message:ack");

    const sendAck = await new Promise<{ ok: boolean; message?: { seq: number } }>((resolve) =>
      client.emit("message:send", { threadId: "th_1", clientId: "c1", text: "سلام دکتر" }, resolve),
    );
    assert.equal(sendAck.ok, true);

    const received = await incoming;
    assert.equal(received.message.text, "سلام دکتر");
    assert.equal((await ackSent).status, "sent");

    // read receipt travels back
    const readEvent = once<{ userId: string; upToSeq: number }>(client, "read");
    coach.emit("read:ack", { threadId: "th_1", upToSeq: received.message.seq });
    const read = await readEvent;
    assert.equal(read.userId, "sp_1");
    assert.equal(read.upToSeq, received.message.seq);

    client.disconnect();
    coach.disconnect();
  });

  it("refuses to join a thread outside the principal's grant", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_9", role: "client", threads: [] });
    const socket = await open(token);
    const result = await new Promise<{ ok: boolean; code?: string }>((resolve) =>
      socket.emit("thread:join", { threadId: "th_1" }, resolve),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "forbidden");
    socket.disconnect();
  });

  it("answers the application heartbeat", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    const socket = await open(token);
    const sentAt = Date.now();
    const pong = await new Promise<{ at: number; serverAt: number }>((resolve) =>
      socket.emit("heartbeat:ping", { at: sentAt }, resolve),
    );
    assert.equal(pong.at, sentAt);
    assert.ok(pong.serverAt >= sentAt);
    socket.disconnect();
  });

  it("tracks presence across two sockets for the same user", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    const a = await open(token);
    const b = await open(token);
    assert.equal(h.presence.isOnline("u_1"), true);
    a.disconnect();
    await new Promise((r) => setTimeout(r, 120));
    // Still online: the second tab is holding the connection.
    assert.equal(h.presence.isOnline("u_1"), true);
    b.disconnect();
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(h.presence.isOnline("u_1"), false);
  });
});

describe("history pagination", () => {
  it("walks backwards with a keyset cursor and never repeats a row", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    for (let i = 0; i < 25; i += 1) {
      await h.repo.appendMessage({ threadId: "th_1", authorId: "u_1", text: `پیام ${i}` });
    }

    const seen = new Set<number>();
    let cursor: string | null = null;
    let pages = 0;

    do {
      const url = new URL(`${h.baseUrl}/api/v1/threads/th_1/messages`);
      url.searchParams.set("limit", "10");
      if (cursor) url.searchParams.set("before", cursor);

      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(res.status, 200);
      const page = (await res.json()) as {
        items: Array<{ seq: number }>;
        nextCursor: string | null;
        hasMore: boolean;
      };

      // Ascending within a page, and no row ever appears twice.
      const seqs = page.items.map((m) => m.seq);
      assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
      for (const seq of seqs) {
        assert.equal(seen.has(seq), false, `duplicate seq ${seq}`);
        seen.add(seq);
      }
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);

    assert.ok(pages >= 3, `expected several pages, walked ${pages}`);
    assert.ok(seen.size >= 25);
  });
});

describe("media pipeline", () => {
  const upload = async (token: string, part: ReturnType<typeof multipart>) =>
    fetch(`${h.baseUrl}/api/v1/threads/th_1/attachments`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": part.contentType },
      body: new Uint8Array(part.body),
    });

  it("accepts a PDF lab report and stages it for the socket to claim", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    const res = await upload(token, multipart({ filename: "lab.pdf", mime: "application/pdf", body: PDF_TINY }));
    assert.equal(res.status, 201);

    const body = (await res.json()) as {
      attachment: { id: string; kind: string; sizeBytes: number };
      previewUrl: string;
    };
    assert.equal(body.attachment.kind, "pdf");
    assert.equal(body.attachment.sizeBytes, PDF_TINY.byteLength);
    assert.match(body.previewUrl, /X-Amz-Expires|expires=/);

    // The staged record is claimable exactly once, and only by its owner.
    const socket = await open(token);
    await new Promise<void>((resolve) =>
      socket.emit("thread:join", { threadId: "th_1" }, () => resolve()),
    );
    const ack = await new Promise<{ ok: boolean; message?: { attachment?: { name: string } } }>((resolve) =>
      socket.emit(
        "message:send",
        { threadId: "th_1", clientId: "c2", attachmentId: body.attachment.id },
        resolve,
      ),
    );
    assert.equal(ack.ok, true);
    assert.equal(ack.message?.attachment?.name, "lab.pdf");

    // Replay is refused — the staging entry was consumed.
    const replay = await new Promise<{ ok: boolean; code?: string }>((resolve) =>
      socket.emit(
        "message:send",
        { threadId: "th_1", clientId: "c3", attachmentId: body.attachment.id },
        resolve,
      ),
    );
    assert.equal(replay.ok, false);
    assert.equal(replay.code, "bad_attachment");
    socket.disconnect();
  });

  it("rejects a file over the 30 MB ceiling", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    // 31 MB of PDF: valid magic number, over the limit.
    const oversized = Buffer.concat([PDF_TINY, Buffer.alloc(31 * 1024 * 1024, 0x20)]);
    const res = await upload(token, multipart({ filename: "huge.pdf", mime: "application/pdf", body: oversized }));

    assert.equal(res.status, 413);
    const body = (await res.json()) as { error: { code: string; details?: { maxBytes: number } } };
    assert.equal(body.error.code, "payload_too_large");
    assert.equal(body.error.details?.maxBytes, 30 * 1024 * 1024);
  });

  it("rejects a MIME type outside the allowlist", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    const res = await upload(
      token,
      multipart({ filename: "x.exe", mime: "application/x-msdownload", body: Buffer.from("MZ") }),
    );
    assert.equal(res.status, 415);
  });

  it("rejects content whose magic number contradicts the declared type", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    // Claims PDF, actually an HTML document.
    const res = await upload(
      token,
      multipart({
        filename: "evil.pdf",
        mime: "application/pdf",
        body: Buffer.from("<html><script>alert(1)</script></html>padding-to-16-bytes"),
      }),
    );
    assert.equal(res.status, 415);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, "unsupported_media_type");
  });

  it("optimises an avatar and returns its renditions", async () => {
    const token = await devToken(h.baseUrl, { userId: "u_1", role: "client", threads: ["th_1"] });
    const part = multipart({ filename: "me.png", mime: "image/png", body: PNG_1PX });
    const res = await fetch(`${h.baseUrl}/api/v1/me/avatar`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": part.contentType },
      body: new Uint8Array(part.body),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as {
      url: string;
      optimized: boolean;
      renditions: Array<{ size: number }>;
    };
    assert.ok(body.url.length > 0);
    if (body.optimized) {
      assert.deepEqual(
        body.renditions.map((r) => r.size),
        [512, 256, 96],
      );
    }
    assert.equal((await h.repo.getUser("u_1"))?.avatarKey !== null, true);
  });
});
