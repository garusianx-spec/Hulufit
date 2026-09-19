import type { AppRole } from "@/types";

/** What the gateway hands back once a code checks out. */
export interface Principal {
  id: string;
  role: AppRole;
  name: string;
  threads: string[];
}

/** Header the double-submit CSRF token is echoed in. */
export const CSRF_HEADER = "x-csrf-token";

export interface Session {
  accessToken: string;
  /** Duration string from the gateway, e.g. `15m`. */
  expiresIn: string;
  /** Echoed into `x-csrf-token` on every state-changing call. */
  csrfToken: string;
  principal: Principal;
}

/** Where each role belongs after signing in. */
const LANDING: Record<AppRole, string> = {
  client: "/",
  specialist: "/doctor",
  admin: "/admin",
};

export function landingFor(role: AppRole): string {
  return LANDING[role];
}

/**
 * Which roles may open which section.
 *
 * This is routing, not authorisation: the API re-checks every request against
 * its own permission table, and a forged role here buys nothing but an empty
 * screen. Longest prefix wins.
 */
const ROUTE_ROLES: Array<{ prefix: string; roles: readonly AppRole[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/doctor", roles: ["specialist", "admin"] },
];

export function mayOpen(role: AppRole, pathname: string): boolean {
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return rule ? rule.roles.includes(role) : true;
}

/**
 * A non-secret hint cookie, readable by the edge middleware so a signed-out
 * visitor is redirected before the shell paints. It carries the role and
 * nothing else — never a token — because anything readable here is also
 * writable by the visitor.
 */
export const HINT_COOKIE = "hf_hint";

export function writeHint(role: AppRole, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${HINT_COOKIE}=${role}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearHint(): void {
  document.cookie = `${HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readHint(): AppRole | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${HINT_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === "client" || value === "specialist" || value === "admin" ? value : null;
}
