import { Router, type Request } from "express";
import type { Config } from "../../config/index.js";
import type { Repository } from "../../db/repository.js";
import { signAccessToken } from "../../auth/tokens.js";
import { ApiError } from "../../lib/errors.js";
import { parseOrThrow } from "../../lib/validate.js";
import type { AuthService } from "./otp.service.js";
import { requestOtpSchema, verifyOtpSchema } from "./otp.schemas.js";
import {
  assertCsrf,
  clearSessionCookies,
  readRefreshToken,
  setSessionCookies,
  type SessionClaims,
} from "./session.js";

/**
 * Passwordless sign-in endpoints.
 *
 * Four routes, one shape: validate with zod, let the service decide, translate
 * the result. Nothing here trusts a field it did not parse, and the refresh
 * cookie is only ever read through `readRefreshToken`.
 */

/** Behind `trust proxy`, `req.ip` is the real client. Never trust a header. */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function sessionResponse(config: Config, claims: SessionClaims, csrfToken: string) {
  return {
    accessToken: signAccessToken(config, claims),
    expiresIn: config.ACCESS_TOKEN_TTL,
    csrfToken,
    principal: {
      id: claims.sub,
      role: claims.role,
      name: claims.name,
      threads: claims.threads,
    },
  };
}

export function otpAuthRouter(deps: { config: Config; repo: Repository; auth: AuthService }) {
  const router = Router();

  router.post("/auth/otp/request", async (req, res, next) => {
    try {
      const { phone } = parseOrThrow(requestOtpSchema, req.body);
      res.json(await deps.auth.requestCode(phone, clientIp(req)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/otp/verify", async (req, res, next) => {
    try {
      const input = parseOrThrow(verifyOtpSchema, req.body);
      const claims = await deps.auth.verifyCode(input.phone, input.code, clientIp(req));
      const { csrfToken } = setSessionCookies(deps.config, res, claims, input.deviceId ?? "web");
      res.json(sessionResponse(deps.config, claims, csrfToken));
    } catch (error) {
      next(error);
    }
  });

  /**
   * Bootstraps a reloaded page: the access token lives in memory only, so the
   * cookie is the sole thing that survives. CSRF is checked first — a refresh
   * mints a credential, so it must never be triggerable cross-site.
   */
  router.post("/auth/refresh", async (req, res, next) => {
    try {
      const { sub, device } = readRefreshToken(deps.config, req);
      assertCsrf(deps.config, req, sub);

      const user = await deps.repo.getUser(sub);
      if (!user) throw ApiError.unauthorized("حساب کاربری یافت نشد.");

      const threads = await deps.repo.listThreadsFor(user.id);
      const claims: SessionClaims = {
        sub: user.id,
        role: user.role,
        name: user.name,
        threads: threads.map((t) => t.id),
      };

      // Rotated on every use, so a stolen cookie has a short useful life.
      const { csrfToken } = setSessionCookies(deps.config, res, claims, device || "web");
      res.json(sessionResponse(deps.config, claims, csrfToken));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/logout", (req, res, next) => {
    try {
      // Best-effort CSRF check: a logout must still work on an expired session.
      try {
        const { sub } = readRefreshToken(deps.config, req);
        assertCsrf(deps.config, req, sub);
      } catch {
        /* fall through — clearing cookies is idempotent and harmless */
      }
      clearSessionCookies(deps.config, res);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
