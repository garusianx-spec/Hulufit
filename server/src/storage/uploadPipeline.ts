import { PassThrough, Readable } from "node:stream";
import type { Request } from "express";
import busboy from "busboy";
import type { Config } from "../config/index.js";
import type { AttachmentKind } from "../db/types.js";
import { ApiError } from "../lib/errors.js";
import { id as newId } from "../lib/ids.js";
import { describe, isAllowed, sniff, sniffMatches } from "./mime.js";
import type { ObjectStore } from "./objectStore.js";

export interface AcceptedUpload {
  key: string;
  kind: AttachmentKind;
  filename: string;
  mime: string;
  sizeBytes: number;
}

const HEAD_BYTES = 16;

/**
 * Streams one multipart file into object storage under a hard byte ceiling.
 *
 * The limit is enforced three ways, in order of how early they stop the work:
 *
 *  1. `Content-Length` is rejected up front when it already exceeds the max, so
 *     an oversized request never opens a socket to the bucket.
 *  2. busboy's own `limits.fileSize` truncates the file stream.
 *  3. A byte counter on the pass-through destroys the pipeline the moment the
 *     ceiling is crossed, which also covers a chunked request that lies about
 *     (or omits) its length.
 *
 * The declared MIME type is checked against the allowlist *and* against the
 * magic number of the first bytes, because the multipart header is caller-
 * controlled.
 */
export function receiveUpload(
  req: Request,
  deps: { config: Config; store: ObjectStore; keyPrefix: string; maxBytes?: number },
): Promise<AcceptedUpload> {
  const maxBytes = deps.maxBytes ?? deps.config.MAX_UPLOAD_BYTES;

  const declaredLength = Number(req.headers["content-length"] ?? 0);
  if (declaredLength > maxBytes + 1024 * 64) {
    // 64 KB of slack for the multipart envelope itself.
    return Promise.reject(
      ApiError.payloadTooLarge(`حجم فایل بیش از حد مجاز است.`, {
        maxBytes,
        declaredBytes: declaredLength,
      }),
    );
  }

  return new Promise<AcceptedUpload>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    let bb: busboy.Busboy;
    try {
      bb = busboy({ headers: req.headers, limits: { files: 1, fileSize: maxBytes } });
    } catch {
      return finish(() =>
        reject(ApiError.badRequest("invalid_multipart", "درخواست multipart معتبر نیست.")),
      );
    }

    let sawFile = false;

    bb.on("file", (_field, stream, info) => {
      sawFile = true;
      const declaredMime = (info.mimeType || "").toLowerCase();
      const original = info.filename || "file";

      if (!isAllowed(declaredMime)) {
        stream.resume();
        return finish(() =>
          reject(
            ApiError.unsupportedMedia("این نوع فایل پشتیبانی نمی‌شود.", { mime: declaredMime }),
          ),
        );
      }

      const meta = describe(declaredMime)!;
      const key = `${deps.keyPrefix}/${new Date().toISOString().slice(0, 10)}/${newId("obj")}.${meta.ext}`;

      let bytes = 0;
      let head: Buffer = Buffer.alloc(0);
      let headChecked = false;
      const relay = new PassThrough();

      stream.on("data", (chunk: Buffer) => {
        bytes += chunk.length;

        if (!headChecked) {
          head = Buffer.concat([head, chunk]);
          if (head.length >= HEAD_BYTES) {
            headChecked = true;
            const sniffed = sniff(head);
            if (!sniffMatches(declaredMime, sniffed)) {
              stream.unpipe(relay);
              stream.resume();
              relay.destroy();
              return finish(() =>
                reject(
                  ApiError.unsupportedMedia("محتوای فایل با نوع اعلام‌شده هم‌خوانی ندارد.", {
                    declared: declaredMime,
                    detected: sniffed,
                  }),
                ),
              );
            }
          }
        }

        if (bytes > maxBytes) {
          stream.unpipe(relay);
          stream.resume();
          relay.destroy();
          finish(() =>
            reject(
              ApiError.payloadTooLarge("حجم فایل بیش از حد مجاز است.", { maxBytes, sizeBytes: bytes }),
            ),
          );
        }
      });

      // busboy's own truncation flag — belt and braces with the counter above.
      stream.on("limit", () => {
        relay.destroy();
        finish(() =>
          reject(ApiError.payloadTooLarge("حجم فایل بیش از حد مجاز است.", { maxBytes })),
        );
      });

      stream.pipe(relay);

      deps.store
        .put({ key, body: relay, contentType: declaredMime, filename: original })
        .then(() => {
          if (settled) {
            // The guard rejected mid-flight; don't leave a partial object behind.
            void deps.store.remove(key).catch(() => {});
            return;
          }
          finish(() =>
            resolve({ key, kind: meta.kind, filename: original, mime: declaredMime, sizeBytes: bytes }),
          );
        })
        .catch((error) => {
          if (settled) return;
          finish(() => reject(error));
        });
    });

    bb.on("filesLimit", () =>
      finish(() => reject(ApiError.badRequest("too_many_files", "فقط یک فایل در هر درخواست."))),
    );
    bb.on("error", (error) => finish(() => reject(error as Error)));
    bb.on("close", () => {
      if (!sawFile) {
        finish(() => reject(ApiError.badRequest("no_file", "فایلی در درخواست نبود.")));
      }
    });

    req.pipe(bb);
  });
}

/** Test/helper entry point that takes a buffer instead of a live request. */
export async function putBuffer(
  store: ObjectStore,
  opts: { buffer: Buffer; mime: string; filename: string; keyPrefix: string; maxBytes: number },
): Promise<AcceptedUpload> {
  if (!isAllowed(opts.mime)) {
    throw ApiError.unsupportedMedia("این نوع فایل پشتیبانی نمی‌شود.", { mime: opts.mime });
  }
  if (opts.buffer.byteLength > opts.maxBytes) {
    throw ApiError.payloadTooLarge("حجم فایل بیش از حد مجاز است.", {
      maxBytes: opts.maxBytes,
      sizeBytes: opts.buffer.byteLength,
    });
  }
  const sniffed = sniff(opts.buffer.subarray(0, HEAD_BYTES));
  if (!sniffMatches(opts.mime, sniffed)) {
    throw ApiError.unsupportedMedia("محتوای فایل با نوع اعلام‌شده هم‌خوانی ندارد.", {
      declared: opts.mime,
      detected: sniffed,
    });
  }

  const meta = describe(opts.mime)!;
  const key = `${opts.keyPrefix}/${new Date().toISOString().slice(0, 10)}/${newId("obj")}.${meta.ext}`;
  await store.put({
    key,
    body: Readable.from(opts.buffer),
    contentType: opts.mime,
    filename: opts.filename,
  });
  return {
    key,
    kind: meta.kind,
    filename: opts.filename,
    mime: opts.mime,
    sizeBytes: opts.buffer.byteLength,
  };
}
