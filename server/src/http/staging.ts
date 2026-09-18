import type { Attachment } from "../db/types.js";
import type { AttachmentStaging } from "../realtime/gateway.js";

/**
 * Two-phase attachment handoff.
 *
 * REST receives the bytes and parks the record here; the socket's
 * `message:send` claims it exactly once. That keeps binary off the websocket
 * while still making the attachment atomic with the message — an upload that is
 * never claimed simply expires instead of leaving an orphan row in the thread.
 */
export class MemoryStaging implements AttachmentStaging {
  private entries = new Map<string, { ownerId: string; attachment: Attachment; expiresAt: number }>();

  constructor(private ttlMs = 30 * 60_000) {}

  put(id: string, ownerId: string, attachment: Attachment) {
    this.sweep();
    this.entries.set(id, { ownerId, attachment, expiresAt: Date.now() + this.ttlMs });
  }

  take(id: string, ownerId: string): Attachment | null {
    this.sweep();
    const entry = this.entries.get(id);
    if (!entry) return null;
    // An attachment can only be sent by the account that uploaded it.
    if (entry.ownerId !== ownerId) return null;
    this.entries.delete(id);
    return entry.attachment;
  }

  private sweep() {
    const now = Date.now();
    for (const [key, value] of this.entries) {
      if (value.expiresAt <= now) this.entries.delete(key);
    }
  }

  get size() {
    this.sweep();
    return this.entries.size;
  }
}
