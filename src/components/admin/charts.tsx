"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { cx, faNumber, toFa } from "@/lib/format";

/**
 * Chart primitives for the operations console.
 *
 * Palette is validated (emerald/sky/amber pass the lightness, chroma, CVD and
 * contrast checks against a white surface). Marks follow one spec throughout:
 * 2px lines, ≥8px end markers with a 2px surface ring, 10% area washes,
 * hairline recessive grid, ≤24px bars with a rounded data-end, and a 2px
 * surface gap between touching marks.
 *
 * Every SVG opts out of the page's RTL so anchors and the time axis stay
 * predictable; the Persian labels inside still shape correctly.
 */

export const SERIES = {
  primary: "#059669",
  sky: "#0284C7",
  amber: "#D97706",
} as const;

const GRID = "#E2E8F0";
const SURFACE = "#FFFFFF";

/* ------------------------------- stat tile ------------------------------- */

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  tone = "ink",
}: {
  label: string;
  value: string;
  unit?: string;
  /** Signed percentage; sign decides the arrow and the tone. */
  delta?: number;
  deltaLabel?: string;
  tone?: "ink" | "primary" | "sky" | "amber";
}) {
  const color = {
    ink: "text-ink",
    primary: "text-primary-700",
    sky: "text-sky-700",
    amber: "text-warn-600",
  }[tone];

  return (
    <div className="app-card p-4">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className={cx("mt-1.5 text-2xl font-extrabold leading-none", color)}>
        {value}
        {unit && <span className="mr-1 text-2xs font-medium text-ink-soft">{unit}</span>}
      </p>
      {delta !== undefined && (
        <p
          className={cx(
            "mt-2 text-2xs font-bold",
            delta >= 0 ? "text-primary-700" : "text-danger-600",
          )}
        >
          {delta >= 0 ? "▲" : "▼"} {faNumber(Math.abs(delta), 1)}٪
          {deltaLabel && <span className="mr-1 font-medium text-ink-soft">{deltaLabel}</span>}
        </p>
      )}
    </div>
  );
}

/* ----------------------------- trend panel ------------------------------- */

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * One measure, one scale, one colour.
 *
 * Three measures at different magnitudes are drawn as three of these — small
 * multiples rather than a dual axis, which would invent a correlation that is
 * not in the data.
 */
export function TrendPanel({
  title,
  points,
  color,
  formatValue,
  height = 132,
}: {
  title: string;
  points: TrendPoint[];
  color: string;
  formatValue: (n: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const W = 320;
  const pad = { top: 14, right: 12, bottom: 20, left: 12 };

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  const plotW = W - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xs = points.map((_, i) => pad.left + (i / Math.max(1, points.length - 1)) * plotW);
  const ys = points.map((p) => pad.top + (1 - (p.value - min) / span) * plotH);

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]!.toFixed(1)},${height - pad.bottom} L${xs[0]!.toFixed(1)},${height - pad.bottom} Z`;

  const last = points[points.length - 1]!;
  const shown = hover !== null ? points[hover]! : last;
  const first = points[0]!;
  const change = ((last.value - first.value) / Math.max(1, first.value)) * 100;

  return (
    <div className="app-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-ink">{title}</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            {hover !== null ? shown.label : "۱۲ هفته اخیر"}
          </p>
        </div>
        <div className="shrink-0 text-left">
          <p className="text-sm font-extrabold text-ink">{formatValue(shown.value)}</p>
          <p className={cx("text-2xs font-bold", change >= 0 ? "text-primary-700" : "text-danger-600")}>
            {change >= 0 ? "▲" : "▼"} {faNumber(Math.abs(change), 0)}٪
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="mt-2 w-full"
        style={{ direction: "ltr" }}
        role="img"
        aria-label={`${title} — روند ۱۲ هفته`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive hairline grid — solid, one step off surface. */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={W - pad.right}
            y1={pad.top + t * plotH}
            y2={pad.top + t * plotH}
            stroke={GRID}
            strokeWidth="1"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Crosshair on hover. */}
        {hover !== null && (
          <line
            x1={xs[hover]}
            x2={xs[hover]}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke={color}
            strokeWidth="1"
            opacity="0.4"
          />
        )}

        {/* End marker: ≥8px with a 2px surface ring so it clears the line. */}
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4.5" fill={color} stroke={SURFACE} strokeWidth="2" />
        {hover !== null && hover !== points.length - 1 && (
          <circle cx={xs[hover]} cy={ys[hover]} r="4.5" fill={color} stroke={SURFACE} strokeWidth="2" />
        )}

        {/* Generous invisible hit targets. */}
        {xs.map((x, i) => (
          <rect
            key={i}
            x={x - plotW / points.length / 2}
            y={0}
            width={plotW / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          />
        ))}

        <text x={pad.left} y={height - 5} fontSize="9" textAnchor="start" className="fill-slate-400">
          {first.label}
        </text>
        <text x={W - pad.right} y={height - 5} fontSize="9" textAnchor="end" className="fill-slate-400">
          {last.label}
        </text>
      </svg>
    </div>
  );
}

/* --------------------------- cohort heatmap ------------------------------ */

export interface Cohort {
  cohort: string;
  size: number;
  m1: number;
  m2: number;
  m3: number;
}

/** Sequential emerald, light → dark. Monotonic lightness, one hue. */
const RAMP = ["#ECFDF5", "#A7F3D0", "#34D399", "#059669", "#047857"];

function rampStep(value: number): string {
  if (value <= 0) return "#F1F5F9";
  const index = Math.min(RAMP.length - 1, Math.floor(value * RAMP.length));
  return RAMP[index]!;
}

/** Ink on the light steps, white on the dark ones — luminance, not guesswork. */
function onRamp(value: number): string {
  return value >= 0.5 ? "#FFFFFF" : "#0F172A";
}

export function CohortHeatmap({ cohorts }: { cohorts: Cohort[] }) {
  const months = [
    { key: "m1" as const, label: "ماه ۱" },
    { key: "m2" as const, label: "ماه ۲" },
    { key: "m3" as const, label: "ماه ۳" },
  ];

  return (
    <div className="app-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-extrabold text-ink">ماندگاری کوهورت‌ها</p>
        <p className="text-2xs text-ink-muted">درصد کاربران فعال‌مانده</p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] border-separate border-spacing-[2px] text-2xs">
          <thead>
            <tr>
              <th className="p-1.5 text-right font-medium text-ink-muted">کوهورت</th>
              <th className="p-1.5 text-center font-medium text-ink-muted">حجم</th>
              {months.map((m) => (
                <th key={m.key} className="p-1.5 text-center font-medium text-ink-muted">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => (
              <tr key={row.cohort}>
                <td className="whitespace-nowrap p-1.5 font-bold text-ink">{row.cohort}</td>
                <td className="p-1.5 text-center text-ink-muted">{faNumber(row.size)}</td>
                {months.map((m) => {
                  const value = row[m.key];
                  return (
                    <td
                      key={m.key}
                      className="rounded-md p-1.5 text-center font-bold tabular-nums"
                      style={{
                        background: rampStep(value),
                        color: value <= 0 ? "#94A3B8" : onRamp(value),
                      }}
                      title={`${row.cohort} — ${m.label}: ${Math.round(value * 100)}٪`}
                    >
                      {value <= 0 ? "—" : `${faNumber(value * 100, 0)}٪`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scale legend — required for a sequential ramp. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[0.6rem] text-ink-soft">کم</span>
        <div className="flex flex-1 gap-[2px]">
          {RAMP.map((c) => (
            <span key={c} className="h-2 flex-1 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[0.6rem] text-ink-soft">زیاد</span>
      </div>
    </div>
  );
}

/* ------------------------------ ranked bars ------------------------------ */

export interface RankedRow {
  id: string;
  label: string;
  value: number;
  meta?: string;
}

/**
 * One series, one colour — a value-ramp here would double-encode bar length as
 * hue and burn the only free channel on information the length already carries.
 */
export function RankedBars({
  title,
  rows,
  formatValue,
  color = SERIES.primary,
}: {
  title: string;
  rows: RankedRow[];
  formatValue: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="app-card p-4">
      <p className="text-xs font-extrabold text-ink">{title}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => {
          const pct = (row.value / max) * 100;
          return (
            <li key={row.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-2xs font-bold text-ink">{row.label}</span>
                <span className="shrink-0 text-2xs font-extrabold tabular-nums text-ink">
                  {formatValue(row.value)}
                </span>
              </div>
              {/* Track then mark; the bar keeps a 4px rounded data-end. */}
              <div className="h-2.5 w-full overflow-hidden rounded-pill bg-canvas" title={row.meta}>
                <motion.div
                  className="h-full rounded-pill"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 140, damping: 26 }}
                />
              </div>
              {row.meta && <p className="mt-1 text-[0.6rem] text-ink-soft">{row.meta}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Shared helper: compact Toman for axis labels and tiles. */
export function faTomanShort(value: number): string {
  if (value >= 1_000_000_000) return `${faNumber(value / 1_000_000_000, 1)} میلیارد`;
  if (value >= 1_000_000) return `${faNumber(value / 1_000_000, 0)} میلیون`;
  return faNumber(value);
}

export { toFa };
