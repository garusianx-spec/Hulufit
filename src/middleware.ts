import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware: response headers, then coarse routing.
 *
 * The headers are the real work. The routing is a courtesy — it keeps a
 * signed-out visitor from watching the shell paint before the client redirects
 * them — and it reads a cookie the visitor could write themselves, so it is
 * never treated as a permission check. Authorisation lives in the gateway.
 */

const HINT_COOKIE = "hf_hint";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Sections worth redirecting away from before they render. */
const PROTECTED = [
  "/",
  "/plans",
  "/specialists",
  "/articles",
  "/profile",
  "/chat",
  "/doctor",
  "/admin",
  "/onboarding",
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}

/**
 * Script policy note.
 *
 * The shell is prerendered so it can be served from the service worker cache,
 * which rules out a per-request nonce: the HTML is written at build time, and
 * Next's own RSC bootstrap is inline. `'unsafe-inline'` is therefore the price
 * of a static, offline-capable PWA. What remains is still worth having — no
 * third-party script origin can load, `object-src` is closed, the base URI is
 * pinned, and the app renders no raw HTML anywhere, so there is no injection
 * point for an inline script to arrive through in the first place.
 */
function contentSecurityPolicy(dev: boolean): string {
  // The websocket gateway shares the API origin; dev also needs Next's HMR socket.
  const connect = ["'self'", API_ORIGIN, API_ORIGIN.replace(/^http/, "ws"), dev ? "ws: wss:" : ""]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    // `unsafe-eval` is React Refresh, development only.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const dev = process.env.NODE_ENV !== "production";
  const { pathname, search } = request.nextUrl;

  const signedIn = Boolean(request.cookies.get(HINT_COOKIE)?.value);
  if (!signedIn && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(dev));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=()",
  );
  if (!dev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own assets and the files a PWA/TWA install
     * fetches unauthenticated — the service worker, the manifest, the icons
     * and the Digital Asset Links statement.
     */
    "/((?!_next/|favicon.ico|sw\\.js|manifest\\.json|icons/|brand/|fonts/|screenshots/|\\.well-known/).*)",
  ],
};
