"use client";

import { motion } from "framer-motion";
import { cx } from "@/lib/format";

export type PlansTab = "diet" | "workout" | "supplements";

export const PLANS_TABS: Array<{ key: PlansTab; label: string; icon: string }> = [
  { key: "diet", label: "رژیم غذایی", icon: "🥗" },
  { key: "workout", label: "تمرین", icon: "🏋️" },
  { key: "supplements", label: "مکمل و دارو", icon: "💊" },
];

/** Segmented sub-tab control with a shared sliding indicator. */
export function PlansTabs({
  active,
  onChange,
}: {
  active: PlansTab;
  onChange: (tab: PlansTab) => void;
}) {
  return (
    <div className="mx-auto max-w-[520px] px-4 pb-3">
      <div
        role="tablist"
        aria-label="زیربخش‌های برنامه‌های من"
        className="flex gap-1 rounded-pill border border-line bg-canvas p-1"
      >
        {PLANS_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.key)}
              className="relative flex-1 rounded-pill px-2 py-2 text-xs font-bold transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId="plans-tab-pill"
                  className="absolute inset-0 rounded-pill bg-surface shadow-card"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={cx(
                  "relative flex items-center justify-center gap-1.5",
                  isActive ? "text-primary-700" : "text-ink-muted",
                )}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
