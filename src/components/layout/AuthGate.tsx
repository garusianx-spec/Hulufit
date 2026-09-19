"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { landingFor, mayOpen } from "@/features/auth/lib/session";
import { useAppStore } from "@/lib/store/AppStore";
import { isPublicPath } from "@/lib/routes";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/**
 * Routing around the session.
 *
 * This is navigation, not authorisation — the gateway re-checks every request
 * against its own permission table. What this buys is that a signed-out visitor
 * never sees a flash of someone else's dashboard, and a specialist who lands on
 * an admin URL is sent somewhere that will actually load.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, principal } = useAuth();
  const { dispatch } = useAppStore();
  const adopted = useRef<string | null>(null);

  // The articles read fine signed out; everything else needs a session.
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "anonymous") {
      if (!isPublic) {
        const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
        router.replace(`/auth${next}`);
      }
      return;
    }

    if (principal && !isPublic && !mayOpen(principal.role, pathname)) {
      router.replace(landingFor(principal.role));
    }
  }, [status, principal, pathname, isPublic, router]);

  // The session decides which side of the product opens first. Done once per
  // sign-in, so the in-app role switch still works afterwards.
  useEffect(() => {
    if (!principal || adopted.current === principal.id) return;
    adopted.current = principal.id;
    dispatch({ type: "role/set", role: principal.role });
  }, [principal, dispatch]);

  if (isPublic) return <>{children}</>;
  if (status !== "authenticated") return <BootSkeleton />;
  return <>{children}</>;
}

/** Holds the shell's shape while the session is resolved. */
function BootSkeleton() {
  return (
    <main className="min-h-dvh bg-canvas px-4 pt-safe" aria-busy="true">
      <div className="flex h-14 items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-40 w-full rounded-card" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}
