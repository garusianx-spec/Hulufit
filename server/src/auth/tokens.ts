import jwt from "jsonwebtoken";
import type { Config } from "../config/index.js";
import { ApiError } from "../lib/errors.js";
import { ROLES, type Principal, type Role } from "./roles.js";

interface Claims {
  sub: string;
  role: Role;
  name: string;
  threads?: string[];
}

export function signAccessToken(config: Config, claims: Claims): string {
  return jwt.sign(
    { role: claims.role, name: claims.name, threads: claims.threads ?? [] },
    config.JWT_SECRET,
    {
      subject: claims.sub,
      issuer: config.JWT_ISSUER,
      expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    },
  );
}

export function verifyAccessToken(config: Config, token: string): Principal {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, {
      issuer: config.JWT_ISSUER,
    }) as jwt.JwtPayload;
  } catch (error) {
    const reason = error instanceof jwt.TokenExpiredError ? "توکن منقضی شده است." : "توکن نامعتبر است.";
    throw ApiError.unauthorized(reason);
  }

  const role = payload.role as Role;
  if (!payload.sub || !ROLES.includes(role)) {
    throw ApiError.unauthorized("توکن نامعتبر است.");
  }

  return {
    sub: payload.sub,
    role,
    name: typeof payload.name === "string" ? payload.name : "",
    threadIds: Array.isArray(payload.threads) ? (payload.threads as string[]) : [],
  };
}

/** Pulls the bearer token out of a header or a socket handshake. */
export function bearer(value: string | undefined): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
