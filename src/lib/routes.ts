/**
 * Which paths are readable signed out.
 *
 * One list, shared by the edge middleware and the client gate, so the two can
 * never disagree — a page the crawler is invited to in `robots.ts` but the
 * middleware redirects away from would be invisible to search and confusing to
 * a visitor following a link.
 */
const PUBLIC_PREFIXES = ["/auth", "/articles"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
