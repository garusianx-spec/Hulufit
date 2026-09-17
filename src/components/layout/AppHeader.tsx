"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import { BrandLockup } from "./Logo";
import { BellIcon, ChevronRight } from "@/components/ui/Icons";

interface AppHeaderProps {
  /** Brand header (home) vs. a titled inner screen with a back affordance. */
  variant?: "brand" | "page";
  title?: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  notificationsCount?: number;
  bordered?: boolean;
  children?: ReactNode;
}

export function AppHeader({
  variant = "brand",
  title,
  subtitle,
  backHref,
  actions,
  notificationsCount = 0,
  bordered = true,
  children,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cx(
        "sticky top-0 z-30 shrink-0 bg-surface/95 pt-[var(--safe-top)] backdrop-blur-md",
        bordered && "border-b border-line",
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[520px] items-center gap-2 px-4">
        {variant === "page" && (
          <button
            type="button"
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            aria-label="بازگشت"
            className="tap-target -mr-2 grid place-items-center rounded-pill p-2 text-ink transition-colors active:bg-canvas"
          >
            {/* RTL: "back" points to the right. */}
            <ChevronRight width={22} height={22} />
          </button>
        )}

        {variant === "brand" ? (
          <BrandLockup />
        ) : (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold text-ink">{title}</h1>
            {subtitle && <p className="truncate text-2xs text-ink-muted">{subtitle}</p>}
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-1">
          {actions}
          {variant === "brand" && (
            <Link
              href="/profile"
              aria-label="اعلان‌ها"
              className="tap-target relative grid place-items-center rounded-pill p-2 text-ink transition-colors active:bg-canvas"
            >
              <BellIcon width={21} height={21} />
              {notificationsCount > 0 && (
                <span className="absolute left-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-pill bg-danger-500 px-1 text-[0.55rem] font-bold text-white">
                  {notificationsCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}
