"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BrandLockup } from "@/components/layout/Logo";
import { useAppStore } from "@/lib/store/AppStore";
import { cx } from "@/lib/format";
import {
  ArticleIcon,
  ChevronRight,
  CoachIcon,
  HomeIcon,
  ProfileIcon,
  SettingsIcon,
} from "@/components/ui/Icons";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  /** Overview matches only itself; the rest also match their sub-routes. */
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "نمای کلی", Icon: HomeIcon, exact: true },
  { href: "/admin/users", label: "کاربران", Icon: ProfileIcon },
  { href: "/admin/specialists", label: "متخصصین", Icon: CoachIcon },
  { href: "/admin/content", label: "محتوا و اعلان", Icon: ArticleIcon },
];

/**
 * Operations console chrome.
 *
 * Deliberately not the mobile `AppShell`: the console is a desktop-first tool
 * with a persistent sidebar, while the client app is a five-tab phone surface.
 * Both draw from the same tokens, so they read as one product.
 */
export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const { dispatch } = useAppStore();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const leaveAdmin = () => {
    dispatch({ type: "role/set", role: "client" });
    router.push("/");
  };

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      {/* Sidebar — icons only on small screens, full labels from lg up. */}
      <aside className="sticky top-0 flex h-[100dvh] w-[4.5rem] shrink-0 flex-col border-l border-line bg-surface lg:w-60">
        <div className="flex h-16 items-center justify-center border-b border-line px-3 lg:justify-start">
          <span className="hidden lg:block">
            <BrandLockup size={24} />
          </span>
          <span className="lg:hidden">
            <BrandLockup size={22} />
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="ناوبری کنسول مدیریت">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex items-center gap-3 rounded-card px-3 py-2.5 text-xs font-bold transition-colors",
                  active ? "text-primary-700" : "text-ink-muted hover:bg-canvas",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-nav"
                    className="absolute inset-0 rounded-card bg-primary-50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon width={19} height={19} className="relative shrink-0" />
                <span className="relative hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={leaveAdmin}
            className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-xs font-bold text-ink-muted transition-colors hover:bg-canvas"
          >
            <ChevronRight width={18} height={18} className="shrink-0" />
            <span className="hidden lg:inline">خروج از کنسول</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-md lg:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold text-ink">{title}</h1>
            {subtitle && <p className="truncate text-2xs text-ink-muted">{subtitle}</p>}
          </div>
          {actions}
          <span className="hidden items-center gap-2 rounded-pill border border-line px-3 py-1.5 sm:flex">
            <SettingsIcon width={14} height={14} className="text-ink-soft" />
            <span className="text-2xs font-bold text-ink-muted">مدیر سامانه</span>
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
