import { id as newId } from "../lib/ids.js";
import type { Attachment, Message, Page, Thread, User } from "./types.js";

/**
 * Persistence boundary.
 *
 * Everything the gateway and the HTTP layer need is expressed here, so the
 * in-memory implementation below can be swapped for Postgres/Prisma without
 * touching a route or a socket handler. Method shapes deliberately mirror what
 * SQL would do — `listMessages` is a keyset scan, not a filter over an array.
 */
export interface Repository {
  getUser(userId: string): Promise<User | null>;
  upsertUser(user: User): Promise<User>;
  setAvatarKey(userId: string, key: string | null): Promise<void>;

  getThread(threadId: string): Promise<Thread | null>;
  listThreadsFor(userId: string): Promise<Thread[]>;

  appendMessage(input: {
    threadId: string;
    authorId: string;
    text?: string;
    attachment?: Attachment;
  }): Promise<Message>;

  /** Newest-first keyset pagination. `before` is the seq of the oldest row seen. */
  listMessages(threadId: string, opts: { before?: number; limit: number }): Promise<Page<Message>>;

  getMessage(messageId: string): Promise<Message | null>;

  /** Marks every message in the thread not authored by `userId` as read. */
  markRead(threadId: string, userId: string, upToSeq: number): Promise<number>;

  markDelivered(threadId: string, upToSeq: number, excludeAuthorId: string): Promise<number>;
}

const nowIso = () => new Date().toISOString();

/**
 * Reference implementation. Deterministic, dependency-free, and good enough to
 * run the whole gateway in dev and in tests.
 */
export class InMemoryRepository implements Repository {
  private users = new Map<string, User>();
  private threads = new Map<string, Thread>();
  private messages = new Map<string, Message[]>();
  private seqs = new Map<string, number>();

  async getUser(userId: string) {
    return this.users.get(userId) ?? null;
  }

  async upsertUser(user: User) {
    this.users.set(user.id, user);
    return user;
  }

  async setAvatarKey(userId: string, key: string | null) {
    const user = this.users.get(userId);
    if (user) this.users.set(userId, { ...user, avatarKey: key });
  }

  async getThread(threadId: string) {
    return this.threads.get(threadId) ?? null;
  }

  async listThreadsFor(userId: string) {
    return [...this.threads.values()].filter(
      (t) => t.clientId === userId || t.specialistId === userId,
    );
  }

  addThread(thread: Thread) {
    this.threads.set(thread.id, thread);
    if (!this.messages.has(thread.id)) this.messages.set(thread.id, []);
    return thread;
  }

  async appendMessage(input: {
    threadId: string;
    authorId: string;
    text?: string;
    attachment?: Attachment;
  }) {
    const seq = (this.seqs.get(input.threadId) ?? 0) + 1;
    this.seqs.set(input.threadId, seq);

    const message: Message = {
      id: newId("msg"),
      threadId: input.threadId,
      authorId: input.authorId,
      text: input.text,
      attachment: input.attachment,
      seq,
      createdAt: nowIso(),
      status: "sent",
      readBy: [input.authorId],
    };

    const list = this.messages.get(input.threadId) ?? [];
    list.push(message);
    this.messages.set(input.threadId, list);
    return message;
  }

  async listMessages(threadId: string, opts: { before?: number; limit: number }) {
    const all = this.messages.get(threadId) ?? [];
    // Keyset, not offset: stable under concurrent writes.
    const filtered = opts.before === undefined ? all : all.filter((m) => m.seq < opts.before!);
    const ordered = [...filtered].sort((a, b) => b.seq - a.seq);
    const items = ordered.slice(0, opts.limit);
    const hasMore = ordered.length > opts.limit;
    const oldest = items[items.length - 1];
    return {
      items,
      hasMore,
      nextCursor: hasMore && oldest ? String(oldest.seq) : null,
    } satisfies Page<Message>;
  }

  async getMessage(messageId: string) {
    for (const list of this.messages.values()) {
      const found = list.find((m) => m.id === messageId);
      if (found) return found;
    }
    return null;
  }

  async markRead(threadId: string, userId: string, upToSeq: number) {
    const list = this.messages.get(threadId) ?? [];
    let changed = 0;
    for (const message of list) {
      if (message.seq > upToSeq) continue;
      if (message.authorId === userId) continue;
      if (message.readBy.includes(userId)) continue;
      message.readBy.push(userId);
      message.status = "read";
      changed += 1;
    }
    return changed;
  }

  async markDelivered(threadId: string, upToSeq: number, excludeAuthorId: string) {
    const list = this.messages.get(threadId) ?? [];
    let changed = 0;
    for (const message of list) {
      if (message.seq > upToSeq) continue;
      if (message.authorId === excludeAuthorId) continue;
      if (message.status !== "sent") continue;
      message.status = "delivered";
      changed += 1;
    }
    return changed;
  }
}
