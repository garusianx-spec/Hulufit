"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import { BottomNav } from "./BottomNav";

/**
 * Fixed viewport shell: header + scrolling pane + bottom nav.
 * The document itself never scrolls, which is what makes the TWA feel native.
 */
export function AppShell({
  header,
  children,
  withNav = true,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  withNav?: boolean;
  className?: string;
}) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      {header}
      <main
        className={cx(
          "mx-auto flex w-full max-w-[520px] flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        {children}
      </main>
      {withNav && <BottomNav />}
    </div>
  );
}

/** Adds the bottom padding a scrolling pane needs to clear the nav bar. */
export function NavSpacer() {
  return <div className="h-[calc(var(--nav-h)+var(--safe-bottom)+1rem)]" aria-hidden="true" />;
}
