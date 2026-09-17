"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cx, faNumber, toFa } from "@/lib/format";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/Icons";

/** Full-width selectable card used by the activity and goal steps. */
export function ChoiceCard({
  icon,
  title,
  hint,
  selected,
  onSelect,
  trailing,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
  trailing?: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-center gap-3 rounded-card border p-3.5 text-right transition-colors",
        selected ? "border-primary-600 bg-primary-50" : "border-line bg-surface",
      )}
    >
      <span
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-pill text-xl",
          selected ? "bg-primary-600 text-white" : "bg-canvas",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-sm font-extrabold", selected ? "text-primary-800" : "text-ink")}>
          {title}
        </span>
        {hint && <span className="mt-0.5 block text-2xs leading-5 text-ink-muted">{hint}</span>}
      </span>
      {trailing}
      <span
        className={cx(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-primary-600 bg-primary-600 text-white" : "border-line",
        )}
      >
        {selected && <CheckIcon width={13} height={13} strokeWidth={3} />}
      </span>
    </motion.button>
  );
}

/** Multi-select pill, for allergies and medical conditions. */
export function TogglePill({
  label,
  selected,
  onToggle,
  tone = "primary",
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  tone?: "primary" | "warn";
}) {
  const active =
    tone === "warn"
      ? "border-warn-500 bg-warn-50 text-warn-600"
      : "border-primary-600 bg-primary-50 text-primary-700";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cx(
        "rounded-pill border px-3 py-2 text-xs font-bold transition-colors",
        selected ? active : "border-line bg-surface text-ink-muted",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Large numeric field with ± steppers and a range slider. Steppers carry the
 * precision (0.1 kg), the slider carries the speed.
 */
export function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step,
  decimals = 0,
  grouping = true,
  hideRange = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  /** Years are plain numbers — grouping them as ۱٬۳۷۳ is wrong. */
  grouping?: boolean;
  hideRange?: boolean;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(decimals))));
  const show = (n: number) => (grouping ? faNumber(n, decimals) : toFa(n.toFixed(decimals)));

  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink">{label}</p>
        {!hideRange && (
          <p className="text-2xs text-ink-soft">
            {show(min)} تا {show(max)} {unit}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <button
          type="button"
          aria-label={`کم کردن ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className="tap-target grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
        >
          <MinusIcon width={19} height={19} />
        </button>

        <motion.div key={value} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-3xl font-extrabold leading-none text-ink">{show(value)}</p>
          <p className="mt-1 text-2xs text-ink-muted">{unit}</p>
        </motion.div>

        <button
          type="button"
          aria-label={`زیاد کردن ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className="tap-target grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
        >
          <PlusIcon width={19} height={19} />
        </button>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label={label}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-line accent-primary-600"
      />
    </div>
  );
}

/** Segmented two-option control (gender). */
export function SegmentedPair<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ key: T; label: string; icon: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-pill border border-line bg-canvas p-1">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            className="relative flex-1 rounded-pill px-3 py-2.5 text-xs font-bold transition-colors"
          >
            {active && (
              <motion.span
                layoutId="gender-pill"
                className="absolute inset-0 rounded-pill bg-surface shadow-card"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={cx("relative flex items-center justify-center gap-1.5", active ? "text-primary-700" : "text-ink-muted")}>
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
