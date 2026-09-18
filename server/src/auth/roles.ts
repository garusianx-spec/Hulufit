/**
 * Three roles, one hierarchy. `admin` inherits everything a specialist can do,
 * a specialist inherits nothing from a client — the two see different data.
 */
export const ROLES = ["client", "specialist", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface Principal {
  sub: string;
  role: Role;
  name: string;
  /** Threads the principal may read. Empty for admins, who may read all. */
  threadIds?: string[];
}

/** Every permission the API checks, grouped by the surface that owns it. */
export const PERMISSIONS = {
  "chat:read": ["client", "specialist", "admin"],
  "chat:write": ["client", "specialist"],
  "media:upload": ["client", "specialist"],
  "media:download": ["client", "specialist", "admin"],
  "avatar:write": ["client", "specialist", "admin"],

  "plan:read": ["client", "specialist", "admin"],
  "plan:write": ["specialist", "admin"],

  "roster:read": ["specialist", "admin"],

  "admin:analytics": ["admin"],
  "admin:users": ["admin"],
  "admin:specialists": ["admin"],
  "admin:content": ["admin"],
  "admin:broadcast": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/**
 * Thread-level authorisation. Role alone is not enough: a specialist may only
 * open the consultations they are actually assigned to.
 */
export function canAccessThread(principal: Principal, threadId: string): boolean {
  if (principal.role === "admin") return true;
  return (principal.threadIds ?? []).includes(threadId);
}
