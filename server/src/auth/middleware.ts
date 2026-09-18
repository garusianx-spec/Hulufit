import type { NextFunction, Request, Response } from "express";
import type { Config } from "../config/index.js";
import { ApiError } from "../lib/errors.js";
import { can, canAccessThread, type Permission, type Principal } from "./roles.js";
import { bearer, verifyAccessToken } from "./tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Attaches the verified principal, or 401s. */
export function authenticate(config: Config) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req.headers.authorization) ?? (req.query.access_token as string | undefined);
    if (!token) return next(ApiError.unauthorized());
    try {
      req.principal = verifyAccessToken(config, token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal = req.principal;
    if (!principal) return next(ApiError.unauthorized());
    if (!can(principal.role, permission)) {
      return next(ApiError.forbidden(`نقش «${principal.role}» اجازه «${permission}» را ندارد.`));
    }
    next();
  };
}

/**
 * Role is necessary but not sufficient for a consultation: the principal must
 * also be a participant. Reads the thread id from the route parameter.
 */
export function requireThreadAccess(param = "threadId") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal = req.principal;
    const threadId = req.params[param];
    if (!principal) return next(ApiError.unauthorized());
    if (!threadId) return next(ApiError.badRequest("missing_thread", "شناسه گفتگو ارسال نشده است."));
    if (!canAccessThread(principal, threadId)) {
      return next(ApiError.forbidden("به این گفتگو دسترسی ندارید."));
    }
    next();
  };
}
