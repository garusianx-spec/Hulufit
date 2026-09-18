import { Router } from "express";
import { authenticate, requirePermission, requireThreadAccess } from "../../auth/middleware.js";
import type { Config } from "../../config/index.js";
import type { Repository } from "../../db/repository.js";
import { canAccessThread } from "../../auth/roles.js";
import type { Attachment } from "../../db/types.js";
import { ApiError } from "../../lib/errors.js";
import { id as newId } from "../../lib/ids.js";
import { AVATAR_MAX_BYTES, processAvatar } from "../../storage/avatarPipeline.js";
import type { ObjectStore } from "../../storage/objectStore.js";
import { receiveUpload } from "../../storage/uploadPipeline.js";
import type { MemoryStaging } from "../staging.js";

export function mediaRouter(deps: {
  config: Config;
  repo: Repository;
  store: ObjectStore;
  staging: MemoryStaging;
}) {
  const router = Router();

  /**
   * Consultation attachment.
   *
   * The bytes are streamed straight to the bucket under the 30 MB ceiling; the
   * resulting record is staged, and the socket's `message:send` claims it. The
   * file never travels over the websocket.
   */
  router.post(
    "/threads/:threadId/attachments",
    authenticate(deps.config),
    requirePermission("media:upload"),
    requireThreadAccess(),
    async (req, res, next) => {
      try {
        const accepted = await receiveUpload(req, {
          config: deps.config,
          store: deps.store,
          keyPrefix: `threads/${req.params.threadId}`,
        });

        const attachment: Attachment = {
          id: newId("att"),
          key: accepted.key,
          kind: accepted.kind,
          name: accepted.filename,
          sizeBytes: accepted.sizeBytes,
          mime: accepted.mime,
        };

        deps.staging.put(attachment.id, req.principal!.sub, attachment);

        res.status(201).json({
          attachment: {
            id: attachment.id,
            kind: attachment.kind,
            name: attachment.name,
            sizeBytes: attachment.sizeBytes,
            mime: attachment.mime,
          },
          // Immediate optimistic preview while the message is still being sent.
          previewUrl: await deps.store.presignGet(attachment.key, { filename: attachment.name }),
          expiresInSeconds: deps.config.PRESIGN_TTL_SECONDS,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Fresh presigned download.
   *
   * Presigned links are deliberately short-lived, so a transcript that has been
   * open for a while re-mints them here rather than shipping long-lived URLs.
   */
  router.get(
    "/messages/:messageId/attachment",
    authenticate(deps.config),
    requirePermission("media:download"),
    async (req, res, next) => {
      try {
        const message = await deps.repo.getMessage(req.params.messageId!);
        if (!message?.attachment) throw ApiError.notFound("پیوستی برای این پیام ثبت نشده است.");
        if (!canAccessThread(req.principal!, message.threadId)) {
          throw ApiError.forbidden("به این گفتگو دسترسی ندارید.");
        }

        const url = await deps.store.presignGet(message.attachment.key, {
          filename: message.attachment.name,
        });
        res.json({ url, expiresInSeconds: deps.config.PRESIGN_TTL_SECONDS });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Avatar upload.
   *
   * The client crops before sending, but the server re-derives every rendition
   * from the received bytes — a client is not a trust boundary, and this also
   * strips EXIF (including GPS) on the way through.
   */
  router.post(
    "/me/avatar",
    authenticate(deps.config),
    requirePermission("avatar:write"),
    async (req, res, next) => {
      try {
        const accepted = await receiveUpload(req, {
          config: deps.config,
          store: deps.store,
          keyPrefix: `avatars/_staging/${req.principal!.sub}`,
          maxBytes: AVATAR_MAX_BYTES,
        });

        if (accepted.kind !== "image") {
          await deps.store.remove(accepted.key);
          throw ApiError.unsupportedMedia("تصویر پروفایل باید یک فایل تصویری باشد.");
        }

        // Re-read the staged object so `sharp` works on exactly what landed.
        const staged = await fetchObject(deps.store, accepted.key);
        const result = await processAvatar(staged, {
          userId: req.principal!.sub,
          mime: accepted.mime,
          store: deps.store,
          config: deps.config,
        });

        await deps.store.remove(accepted.key);
        await deps.repo.setAvatarKey(req.principal!.sub, result.key);

        res.status(201).json({
          url: result.url,
          optimized: result.optimized,
          renditions: result.renditions.map((r) => ({ size: r.size, bytes: r.bytes })),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/me/avatar",
    authenticate(deps.config),
    requirePermission("avatar:write"),
    async (req, res, next) => {
      try {
        await deps.repo.setAvatarKey(req.principal!.sub, null);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

/**
 * Reads an object back out of the store.
 *
 * The in-memory store keeps buffers directly; S3 hands back a stream. Both are
 * normalised here so the avatar pipeline never has to care which is in play.
 */
async function fetchObject(store: ObjectStore, key: string): Promise<Buffer> {
  const maybeMemory = store as unknown as { objects?: Map<string, { body: Buffer }> };
  const direct = maybeMemory.objects?.get(key);
  if (direct) return direct.body;

  const url = await store.presignGet(key, { ttlSeconds: 60 });
  const response = await fetch(url);
  if (!response.ok) throw ApiError.notFound("فایل آپلودشده یافت نشد.");
  return Buffer.from(await response.arrayBuffer());
}
