import type { Config } from "../config/index.js";
import { ApiError } from "../lib/errors.js";
import { id as newId } from "../lib/ids.js";
import { AVATAR_ALLOWED } from "./mime.js";
import type { ObjectStore } from "./objectStore.js";

/**
 * Server-side avatar normalisation.
 *
 * The client already crops to a square and downscales, but a client is not a
 * trust boundary: this re-derives every rendition from the received bytes, so
 * a hand-crafted request cannot put a 40 MP image or an EXIF payload on the CDN.
 *
 * `sharp` is loaded lazily. It ships platform binaries, and a deployment that
 * cannot install them should still be able to run chat — avatars degrade to
 * "stored as received" rather than taking the whole service down.
 */

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

/** Square renditions, largest first. @2x retina, @1x, and a list thumbnail. */
export const AVATAR_SIZES = [512, 256, 96] as const;

export interface AvatarResult {
  /** Key of the canonical (largest) rendition. */
  key: string;
  renditions: Array<{ size: number; key: string; bytes: number }>;
  url: string;
  optimized: boolean;
}

type SharpModule = typeof import("sharp");
let sharpModule: SharpModule | null | undefined;

async function loadSharp(): Promise<SharpModule | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default as unknown as SharpModule;
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

export async function processAvatar(
  buffer: Buffer,
  opts: { userId: string; mime: string; store: ObjectStore; config: Config },
): Promise<AvatarResult> {
  if (!AVATAR_ALLOWED.has(opts.mime)) {
    throw ApiError.unsupportedMedia("تصویر پروفایل باید JPEG، PNG یا WebP باشد.", { mime: opts.mime });
  }
  if (buffer.byteLength > AVATAR_MAX_BYTES) {
    throw ApiError.payloadTooLarge("حجم تصویر پروفایل بیش از حد مجاز است.", {
      maxBytes: AVATAR_MAX_BYTES,
      sizeBytes: buffer.byteLength,
    });
  }

  const sharp = await loadSharp();
  const stamp = newId("av");
  const base = `avatars/${opts.userId}/${stamp}`;

  if (!sharp) {
    // Degraded path: store the original, still square-cropped by the client.
    const key = `${base}-original`;
    await opts.store.put({
      key,
      body: buffer,
      contentType: opts.mime,
      cacheControl: "public, max-age=31536000, immutable",
    });
    return {
      key,
      renditions: [{ size: 0, key, bytes: buffer.byteLength }],
      url: await opts.store.publicOrSignedUrl(key),
      optimized: false,
    };
  }

  const probe = sharp(buffer, { failOn: "error" });
  const meta = await probe.metadata();
  if (!meta.width || !meta.height) {
    throw ApiError.badRequest("bad_image", "تصویر قابل خواندن نیست.");
  }

  // Centre-crop to a square before resizing, so no rendition is letterboxed.
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);

  const renditions: AvatarResult["renditions"] = [];
  for (const size of AVATAR_SIZES) {
    const out = await sharp(buffer, { failOn: "error" })
      .rotate() // honour EXIF orientation, then drop the metadata
      .extract({ left, top, width: side, height: side })
      .resize(size, size, { fit: "cover", withoutEnlargement: false })
      .webp({ quality: size >= 256 ? 82 : 76, effort: 4 })
      .toBuffer();

    const key = `${base}-${size}.webp`;
    await opts.store.put({
      key,
      body: out,
      contentType: "image/webp",
      contentLength: out.byteLength,
      cacheControl: "public, max-age=31536000, immutable",
    });
    renditions.push({ size, key, bytes: out.byteLength });
  }

  const canonical = renditions[0]!;
  return {
    key: canonical.key,
    renditions,
    url: await opts.store.publicOrSignedUrl(canonical.key),
    optimized: true,
  };
}

/** srcset for an <img>, so the browser picks the rendition it needs. */
export async function avatarSrcSet(result: AvatarResult, store: ObjectStore): Promise<string> {
  const parts = await Promise.all(
    result.renditions
      .filter((r) => r.size > 0)
      .map(async (r) => `${await store.publicOrSignedUrl(r.key)} ${r.size}w`),
  );
  return parts.join(", ");
}
