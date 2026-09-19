"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { clamp, cx, faNumber } from "@/lib/format";
import { CheckMorph, type CheckTone } from "./CheckMorph";

/* ------------------------------- Section -------------------------------- */

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("px-4", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* --------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  as: As = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx("app-card p-4", className)} {...rest}>
      {children}
    </As>
  );
}

/* ------------------------------- Separator ------------------------------- */

/**
 * Inline separator between metadata fragments.
 * A middot character is unusable here: next to Persian digits (۰ renders as a
 * dot in most faces, IRANYekan included) it reads as a zero. A rendered dot
 * element is unambiguous at every size.
 */
export function Sep({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("mx-1.5 inline-block h-[3px] w-[3px] rounded-full bg-current align-middle opacity-40", className)}
    />
  );
}

/* --------------------------------- Chip ---------------------------------- */

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("app-chip whitespace-nowrap", active && "app-chip-active", className)}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Checkbox -------------------------------- */

export function CheckBubble({
  checked,
  onChange,
  size = 26,
  label,
  tone = "primary",
}: {
  checked: boolean;
  onChange: () => void;
  size?: number;
  label: string;
  tone?: CheckTone;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      whileTap={{ scale: 0.86 }}
      className="tap-target grid shrink-0 place-items-center"
    >
      <CheckMorph done={checked} size={size} tone={tone} />
    </motion.button>
  );
}

/* --------------------------------- Toggle -------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-pill border transition-colors",
        checked ? "border-primary-600 bg-primary-600" : "border-line bg-slate-200",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
        style={checked ? { left: 2 } : { right: 2 }}
      />
    </button>
  );
}

/* ------------------------------- Progress -------------------------------- */

export function ProgressBar({
  value,
  tone = "primary",
  height = 8,
  className,
}: {
  value: number;
  tone?: "primary" | "sky" | "warn" | "danger";
  height?: number;
  className?: string;
}) {
  const bg = {
    primary: "bg-primary-600",
    sky: "bg-sky-600",
    warn: "bg-warn-500",
    danger: "bg-danger-500",
  }[tone];
  return (
    <div
      className={cx("w-full overflow-hidden rounded-pill bg-line", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamp(value, 0, 100))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cx("h-full rounded-pill", bg)}
        initial={{ width: 0 }}
        animate={{ width: `${clamp(value, 0, 100)}%` }}
        transition={{ type: "spring", stiffness: 160, damping: 28 }}
      />
    </div>
  );
}

/* --------------------------------- Stat ---------------------------------- */

export function Stat({
  label,
  value,
  unit,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "ink" | "primary" | "sky" | "warn";
}) {
  const color = {
    ink: "text-ink",
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
  }[tone];
  return (
    <div className="text-center">
      <p className={cx("text-lg font-extrabold leading-tight", color)}>
        {typeof value === "number" ? faNumber(value) : value}
        {unit && <span className="mr-1 text-2xs font-medium text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-0.5 text-2xs text-ink-muted">{label}</p>
    </div>
  );
}

/* --------------------------------- Avatar -------------------------------- */

export function Avatar({
  src,
  name,
  size = 44,
  ring,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter((p) => p && !["دکتر", "مربی"].includes(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <span
      className={cx(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-100 text-primary-700",
        ring && "ring-2 ring-primary-600 ring-offset-2 ring-offset-surface",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // Object URLs and data URLs — next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold">{initials}</span>
      )}
    </span>
  );
}

/* -------------------------------- Empty ---------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-ink-soft">{icon}</span>
      <p className="text-sm font-bold text-ink">{title}</p>
      {description && <p className="max-w-[260px] text-xs leading-5 text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

/* ------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-line/70", className)} />;
}
