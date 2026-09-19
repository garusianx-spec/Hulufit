import type { Role } from "../auth/roles.js";

export type MessageStatus = "sent" | "delivered" | "read";
export type AttachmentKind = "image" | "pdf" | "audio" | "lab" | "other";

export interface User {
  id: string;
  role: Role;
  name: string;
  /** Canonical `+989XXXXXXXXX`. Null for accounts created before sign-in. */
  phone: string | null;
  avatarKey: string | null;
  createdAt: string;
}

export interface Thread {
  id: string;
  clientId: string;
  specialistId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  /** Object key in the bucket — never handed to a client directly. */
  key: string;
  kind: AttachmentKind;
  name: string;
  sizeBytes: number;
  mime: string;
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  text?: string;
  attachment?: Attachment;
  /** Monotonic within a thread — the cursor for history pagination. */
  seq: number;
  createdAt: string;
  status: MessageStatus;
  readBy: string[];
}

export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next (older) page; null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}
