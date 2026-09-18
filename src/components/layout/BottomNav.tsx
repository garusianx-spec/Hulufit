"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useAppStore } from "@/lib/store/AppStore";
import {
  ArticleIcon,
  ChatIcon,
  CoachIcon,
  HomeIcon,
  PlansIcon,
  ProfileIcon,
} from "@/components/ui/Icons";

const CLIENT_TABS = [
  { href: "/", label: "امروز", Icon: HomeIcon },
  { href: "/plans", label: "برنامه‌های من", Icon: PlansIcon },
  { href: "/specialists", label: "مشاورین", Icon: CoachIcon },
  { href: "/articles", label: "مقالات", Icon: ArticleIcon },
  { href: "/profile", label: "پروفایل", Icon: ProfileIcon },
] as const;

/** Doctor View swaps the first three tabs for the specialist's own workflow. */
const SPECIALIST_TABS = [
  { href: "/doctor", label: "بیماران", Icon: CoachIcon },
  { href: "/doctor/desk", label: "میز مشاوره", Icon: ChatIcon },
  { href: "/articles", label: "مقالات", Icon: ArticleIcon },
  { href: "/profile", label: "پروفایل", Icon: ProfileIcon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Five fixed tabs, safe-area aware, always on top of the scroll pane. */
export function BottomNav() {
  const pathname = usePathname() || "/";
  const { role } = useAppStore();

  // The operations console is a desktop surface with its own sidebar.
  if (role === "admin" || pathname.startsWith("/admin")) return null;

  const tabs = role === "specialist" ? SPECIALIST_TABS : CLIENT_TABS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[var(--safe-bottom)] backdrop-blur-md"
      aria-label="ناوبری اصلی"
    >
      <ul className="mx-auto flex max-w-[520px] items-stretch">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-[var(--nav-h)] flex-col items-center justify-center gap-1 px-1"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-2 top-1.5 h-9 rounded-pill bg-primary-50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={cx(
                    "relative transition-colors",
                    active ? "text-primary-700" : "text-ink-soft",
                  )}
                >
                  <Icon width={22} height={22} strokeWidth={active ? 2.1 : 1.7} />
                </span>
                <span
                  className={cx(
                    "relative text-[0.625rem] leading-none transition-colors",
                    active ? "font-extrabold text-primary-700" : "font-medium text-ink-muted",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
