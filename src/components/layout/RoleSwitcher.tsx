"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useAppStore } from "@/lib/store/AppStore";
import { CoachIcon, ProfileIcon, SettingsIcon } from "@/components/ui/Icons";
import type { AppRole } from "@/types";

const ROLES: Array<{ key: AppRole; label: string; icon: typeof CoachIcon; home: string }> = [
  { key: "client", label: "مراجع", icon: ProfileIcon, home: "/" },
  { key: "specialist", label: "متخصص", icon: CoachIcon, home: "/doctor" },
  { key: "admin", label: "مدیر", icon: SettingsIcon, home: "/admin" },
];

/**
 * Mock role switch between the client app and the specialist portal.
 *
 * Standing in for the role claim a real session would carry, so both sides of
 * the product are reachable without auth. Switching also navigates to that
 * role's home, because the other role's routes are not in its nav.
 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { role, dispatch } = useAppStore();

  const switchTo = (next: AppRole) => {
    if (next === role) return;
    dispatch({ type: "role/set", role: next });
    router.push(ROLES.find((r) => r.key === next)!.home);
  };

  return (
    <div
      role="group"
      aria-label="تغییر نقش"
      className={cx(
        "flex gap-0.5 rounded-pill border border-line bg-canvas p-0.5",
        compact ? "" : "w-full p-1",
      )}
    >
      {ROLES.map((option) => {
        const active = option.key === role;
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => switchTo(option.key)}
            aria-pressed={active}
            className={cx(
              "relative rounded-pill font-bold transition-colors",
              compact ? "px-2.5 py-1 text-[0.6rem]" : "flex-1 px-3 py-2 text-xs",
            )}
          >
            {active && (
              <motion.span
                layoutId={compact ? "role-pill-compact" : "role-pill"}
                className="absolute inset-0 rounded-pill bg-surface shadow-card"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span
              className={cx(
                "relative flex items-center justify-center gap-1",
                active ? "text-primary-700" : "text-ink-muted",
              )}
            >
              <Icon width={compact ? 12 : 15} height={compact ? 12 : 15} />
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
