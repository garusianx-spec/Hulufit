"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { mayOpen } from "@/features/auth/lib/session";
import { CoachIcon, ProfileIcon, SettingsIcon } from "@/components/ui/Icons";
import type { AppRole } from "@/types";

const ROLES: Array<{ key: AppRole; label: string; icon: typeof CoachIcon; home: string }> = [
  { key: "client", label: "مراجع", icon: ProfileIcon, home: "/" },
  { key: "specialist", label: "متخصص", icon: CoachIcon, home: "/doctor" },
  { key: "admin", label: "مدیر", icon: SettingsIcon, home: "/admin" },
];

/**
 * Switches between the sides of the product the signed-in account may open.
 *
 * Offering a role the session does not carry would only produce a screen whose
 * every request the gateway refuses, so the options are filtered by the same
 * table that guards the routes. One option left means nothing to switch.
 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { role, dispatch } = useAppStore();
  const { principal } = useAuth();

  const available = principal ? ROLES.filter((r) => mayOpen(principal.role, r.home)) : [];
  if (available.length < 2) return null;

  const switchTo = (next: AppRole, home: string) => {
    if (next === role) return;
    dispatch({ type: "role/set", role: next });
    router.push(home);
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
      {available.map((option) => {
        const active = option.key === role;
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => switchTo(option.key, option.home)}
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
