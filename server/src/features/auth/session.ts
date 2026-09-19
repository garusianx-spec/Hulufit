import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Config } from "../../config/index.js";
import type { Role } from "../../auth/roles.js";
import { ApiError } from "../../lib/errors.js";

/**
 * Session transport.
 *
 * The access token is short-lived and returned in the response body for the
 * SPA to hold in memory. The refresh token is an httpOnly, SameSite=Strict,
 * Secure cookie the JavaScript can never read — so an XSS foothold cannot
 * exfiltrate a long-lived credential, and a cross-site form post cannot
 * silently use one.
 */

export const REFRESH_COOKIE = "hf_rt";
export const CSRF_COOKIE = "hf_csrf";
export const CSRF_HEADER = "x-csrf-token";

export interface SessionClaims {
  sub: string;
  role: Role;
  name: string;
  threads: string[];
}

function cookieBase(config: Config): CookieOptions {
  const secure = config.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    // Strict is safe here: the SPA is same-site, and no OAuth redirect has to
    // arrive with the cookie attached.
    sameSite: "strict",
    path: "/api/v1/auth",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
}

export function issueAccessToken(config: Config, claims: SessionClaims): string {
  return jwt.sign(
    { role: claims.role, name: claims.name, threads: claims.threads },
    config.JWT_SECRET,
    {
      subject: claims.sub,
      issuer: config.JWT_ISSUER,
      expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    },
  );
}

export function issueRefreshToken(config: Config, claims: SessionClaims, deviceId: string): string {
  return jwt.sign({ typ: "refresh", device: deviceId }, config.JWT_SECRET, {
    subject: claims.sub,
    issuer: config.JWT_ISSUER,
    expiresIn: config.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function readRefreshToken(config: Config, req: Request): { sub: string; device: string } {
  const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (!raw) throw ApiError.unauthorized("نشست یافت نشد. دوباره وارد شوید.");
  try {
    const payload = jwt.verify(raw, config.JWT_SECRET, { issuer: config.JWT_ISSUER }) as jwt.JwtPayload;
    if (payload.typ !== "refresh" || !payload.sub) throw new Error("wrong type");
    return { sub: payload.sub, device: String(payload.device ?? "") };
  } catch {
    throw ApiError.unauthorized("نشست منقضی شده است. دوباره وارد شوید.");
  }
}

/**
 * Double-submit CSRF.
 *
 * The cookie is readable by the page (it must be, to be echoed back), but its
 * value is an HMAC over the session subject, so it cannot be forged from
 * another origin — and an attacker's site cannot read ours to copy it.
 */
export function csrfTokenFor(config: Config, sub: string): string {
  const nonce = randomBytes(8).toString("hex");
  const mac = createHmac("sha256", config.JWT_SECRET).update(`${sub}:${nonce}`).digest("hex").slice(0, 32);
  return `${nonce}.${mac}`;
}

export function assertCsrf(config: Config, req: Request, sub: string): void {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  const header = req.header(CSRF_HEADER);
  if (!cookie || !header) throw ApiError.forbidden("توکن CSRF ارسال نشده است.");

  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw ApiError.forbidden("توکن CSRF نامعتبر است.");
  }

  const [nonce, mac] = cookie.split(".");
  if (!nonce || !mac) throw ApiError.forbidden("توکن CSRF نامعتبر است.");
  const expected = createHmac("sha256", config.JWT_SECRET)
    .update(`${sub}:${nonce}`)
    .digest("hex")
    .slice(0, 32);
  if (mac !== expected) throw ApiError.forbidden("توکن CSRF نامعتبر است.");
}

export function setSessionCookies(
  config: Config,
  res: Response,
  claims: SessionClaims,
  deviceId: string,
): { csrfToken: string } {
  const base = cookieBase(config);
  res.cookie(REFRESH_COOKIE, issueRefreshToken(config, claims, deviceId), {
    ...base,
    maxAge: config.REFRESH_TOKEN_TTL_MS,
  });

  const csrfToken = csrfTokenFor(config, claims.sub);
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...base,
    // Readable by the page so it can echo the value into the header.
    httpOnly: false,
    path: "/",
    maxAge: config.REFRESH_TOKEN_TTL_MS,
  });

  return { csrfToken };
}

export function clearSessionCookies(config: Config, res: Response): void {
  const base = cookieBase(config);
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: "/" });
}
