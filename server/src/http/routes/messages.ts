import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, requireThreadAccess } from "../../auth/middleware.js";
import type { Config } from "../../config/index.js";
import type { Repository } from "../../db/repository.js";
import { ApiError } from "../../lib/errors.js";
import type { ObjectStore } from "../../storage/objectStore.js";

const querySchema = z.object({
  /** Seq of the oldest row already held by the client; omit for the first page. */
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

/**
 * Cursor-based history.
 *
 * Keyset over `seq`, not OFFSET: a page stays correct while the other
 * participant keeps sending, and the query cost does not grow with depth.
 */
export function messagesRouter(deps: { config: Config; repo: Repository; store: ObjectStore }) {
  const router = Router();

  router.get(
    "/threads/:threadId/messages",
    authenticate(deps.config),
    requirePermission("chat:read"),
    requireThreadAccess(),
    async (req, res, next) => {
      try {
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
          throw ApiError.badRequest(
            "bad_query",
            "پارامترهای صفحه‌بندی نامعتبر است.",
            parsed.error.issues,
          );
        }
        const threadId = req.params.threadId!;
        const page = await deps.repo.listMessages(threadId, parsed.data);

        const items = await Promise.all(
          page.items.map(async (message) => ({
            id: message.id,
            threadId: message.threadId,
            authorId: message.authorId,
            text: message.text,
            seq: message.seq,
            createdAt: message.createdAt,
            status: message.status,
            attachment: message.attachment
              ? {
                  id: message.attachment.id,
                  kind: message.attachment.kind,
                  name: message.attachment.name,
                  sizeBytes: message.attachment.sizeBytes,
                  mime: message.attachment.mime,
                  durationSec: message.attachment.durationSec,
                  url: await deps.store.presignGet(message.attachment.key, {
                    filename: message.attachment.name,
                  }),
                }
              : undefined,
          })),
        );

        res.json({
          // Ascending, because that is the order a transcript renders in.
          items: items.reverse(),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/threads", authenticate(deps.config), requirePermission("chat:read"), async (req, res, next) => {
    try {
      const threads = await deps.repo.listThreadsFor(req.principal!.sub);
      res.json({ items: threads });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
