import type { AttachmentKind } from "@/types";
import { faFileSize } from "@/lib/format";

/**
 * Single source of truth for the attachment pipeline limits.
 * The 30 MB ceiling is enforced three times: at the <input accept/> level,
 * here on the client before any bytes move, and (contractually) by the API.
 */
export const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_ATTACHMENT_LABEL = "۳۰ مگابایت";

/** Per-kind ceilings: an avatar has no business being 30 MB. */
export const KIND_LIMITS: Record<AttachmentKind, number> = {
  image: 12 * 1024 * 1024,
  pdf: MAX_ATTACHMENT_BYTES,
  audio: 20 * 1024 * 1024,
  lab: MAX_ATTACHMENT_BYTES,
  other: MAX_ATTACHMENT_BYTES,
};

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_MIME: Record<AttachmentKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  pdf: ["application/pdf"],
  audio: ["audio/webm", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/aac"],
  lab: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  other: [],
};

export const CHAT_ACCEPT_ATTR = [
  ...ACCEPTED_MIME.image,
  ...ACCEPTED_MIME.pdf,
  ...ACCEPTED_MIME.audio,
].join(",");

export const AVATAR_ACCEPT_ATTR = ACCEPTED_MIME.image.join(",");

export function kindOf(file: File): AttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("audio/")) return "audio";
  return "other";
}

export type GuardResult =
  | { ok: true; kind: AttachmentKind }
  | { ok: false; code: "too-large" | "empty" | "unsupported-type"; message: string };

/**
 * Client-side gate. Runs before an object URL is created or a request opened,
 * so an oversized pick costs the user nothing but a toast.
 */
export function guardFile(file: File, opts?: { maxBytes?: number; allow?: AttachmentKind[] }): GuardResult {
  const kind = kindOf(file);
  const allow = opts?.allow;

  if (file.size === 0) {
    return { ok: false, code: "empty", message: "این فایل خالی است و قابل ارسال نیست." };
  }

  if (allow && !allow.includes(kind)) {
    return {
      ok: false,
      code: "unsupported-type",
      message: "فرمت این فایل پشتیبانی نمی‌شود. تصویر، PDF یا فایل صوتی بفرستید.",
    };
  }

  if (kind === "other" && !allow) {
    return {
      ok: false,
      code: "unsupported-type",
      message: "فرمت این فایل پشتیبانی نمی‌شود. تصویر، PDF یا فایل صوتی بفرستید.",
    };
  }

  const max = opts?.maxBytes ?? KIND_LIMITS[kind] ?? MAX_ATTACHMENT_BYTES;
  if (file.size > max) {
    return {
      ok: false,
      code: "too-large",
      message: `حجم فایل ${faFileSize(file.size)} است؛ حداکثر مجاز ${faFileSize(max)} می‌باشد.`,
    };
  }

  return { ok: true, kind };
}

/** Batch guard used by the multi-pick attachment sheet. */
export function guardFiles(files: File[], opts?: { maxBytes?: number; allow?: AttachmentKind[] }) {
  const accepted: Array<{ file: File; kind: AttachmentKind }> = [];
  const rejected: Array<{ file: File; message: string }> = [];
  for (const file of files) {
    const result = guardFile(file, opts);
    if (result.ok) accepted.push({ file, kind: result.kind });
    else rejected.push({ file, message: result.message });
  }
  return { accepted, rejected };
}
