import { Router } from "express";
import { z } from "zod";
import { ROLES, type Role } from "../../auth/roles.js";
import { signAccessToken } from "../../auth/tokens.js";
import type { Config } from "../../config/index.js";
import type { Repository } from "../../db/repository.js";
import { ApiError } from "../../lib/errors.js";

const devLoginSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
  name: z.string().default(""),
  threads: z.array(z.string()).default([]),
});

/**
 * Token issuance.
 *
 * The product has no sign-in yet, so this exposes a development-only endpoint
 * that mints a scoped token for a known account. It is refused outright in
 * production — when real auth lands, replace the handler body and every other
 * layer keeps working, because they only ever see a verified `Principal`.
 */
export function authRouter(deps: { config: Config; repo: Repository }) {
  const router = Router();

  router.post("/auth/dev-token", async (req, res, next) => {
    try {
      if (deps.config.NODE_ENV === "production") {
        throw ApiError.forbidden("این مسیر در محیط عملیاتی غیرفعال است.");
      }
      const parsed = devLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw ApiError.badRequest("bad_request", "پارامترهای ورود نامعتبر است.", parsed.error.issues);
      }

      const { userId, role, name, threads } = parsed.data;
      await deps.repo.upsertUser({
        id: userId,
        role: role as Role,
        name,
        phone: null,
        avatarKey: null,
        createdAt: new Date().toISOString(),
      });

      res.json({
        accessToken: signAccessToken(deps.config, { sub: userId, role, name, threads }),
        expiresIn: deps.config.ACCESS_TOKEN_TTL,
        principal: { id: userId, role, name, threads },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
