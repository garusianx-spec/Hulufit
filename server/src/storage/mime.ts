import type { AttachmentKind } from "../db/types.js";

/**
 * MIME allowlist. Anything not listed here never reaches the bucket.
 *
 * Extensions are pinned per type so a caller cannot smuggle `report.pdf.html`
 * past a CDN that sniffs by suffix.
 */
export const ALLOWED: Record<string, { kind: AttachmentKind; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/heic": { kind: "image", ext: "heic" },
  "image/heif": { kind: "image", ext: "heif" },
  "application/pdf": { kind: "pdf", ext: "pdf" },
  "audio/webm": { kind: "audio", ext: "webm" },
  "audio/mpeg": { kind: "audio", ext: "mp3" },
  "audio/mp4": { kind: "audio", ext: "m4a" },
  "audio/ogg": { kind: "audio", ext: "ogg" },
  "audio/wav": { kind: "audio", ext: "wav" },
  "audio/aac": { kind: "audio", ext: "aac" },
};

export const AVATAR_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function isAllowed(mime: string): boolean {
  return mime in ALLOWED;
}

export function describe(mime: string) {
  return ALLOWED[mime] ?? null;
}

/**
 * Magic-number check.
 *
 * The multipart Content-Type is attacker-controlled, so the first bytes of the
 * stream are verified against the declared type before the object is committed.
 */
export function sniff(head: Buffer): string | null {
  if (head.length < 12) return null;

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP")
    return "image/webp";
  if (head.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (head.subarray(0, 4).toString("latin1") === "OggS") return "audio/ogg";
  if (head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WAVE")
    return "audio/wav";
  // EBML — WebM audio or video.
  if (head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "audio/webm";
  // ISO-BMFF: MP4/M4A/HEIC all share the ftyp box; the brand disambiguates.
  if (head.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = head.subarray(8, 12).toString("latin1");
    if (brand.startsWith("hei") || brand.startsWith("mif")) return "image/heic";
    return "audio/mp4";
  }
  if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) return "audio/mpeg"; // ID3
  if (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0) return "audio/mpeg"; // raw MPEG frame

  return null;
}

/**
 * True when the sniffed type is compatible with what the client declared.
 * Containers overlap (m4a/heic/mp4), so the comparison is by family, not exact.
 */
export function sniffMatches(declared: string, sniffed: string | null): boolean {
  if (!sniffed) return false;
  if (declared === sniffed) return true;
  const family = (m: string) => m.split("/")[0] ?? "";
  // An ISO-BMFF container can legitimately be declared as any of its brands.
  const isoFamily = new Set(["audio/mp4", "image/heic", "image/heif"]);
  if (isoFamily.has(declared) && isoFamily.has(sniffed)) return true;
  return family(declared) === family(sniffed) && family(declared) === "audio";
}
