"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Bits";
import { cx, faDate, faNumber } from "@/lib/format";
import type { WeightEntry } from "@/types";

const RANGES = [
  { key: "1m", label: "۱ ماه", days: 30 },
  { key: "3m", label: "۳ ماه", days: 90 },
  { key: "all", label: "همه", days: 9999 },
] as const;

/** Weight trend line with target band, min/max and a scrubber. */
export function WeightTrendChart({
  entries,
  targetKg,
}: {
  entries: WeightEntry[];
  targetKg: number;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("3m");
  const [active, setActive] = useState<number | null>(null);

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    const cutoff = Date.now() - days * 86400000;
    const filtered = entries.filter((e) => new Date(e.date).getTime() >= cutoff);
    return filtered.length >= 2 ? filtered : entries.slice(-2);
  }, [entries, range]);

  const W = 320;
  const H = 150;
  const pad = { top: 14, bottom: 22, left: 8, right: 8 };

  const values = data.map((d) => d.weightKg);
  const min = Math.min(...values, targetKg) - 1;
  const max = Math.max(...values) + 1;
  const span = Math.max(0.1, max - min);

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(1, data.length - 1)) * (W - pad.left - pad.right),
    y: pad.top + (1 - (d.weightKg - min) / span) * (H - pad.top - pad.bottom),
    entry: d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${H - pad.bottom} L${points[0].x.toFixed(1)},${H - pad.bottom} Z`;
  const targetY = pad.top + (1 - (targetKg - min) / span) * (H - pad.top - pad.bottom);

  const first = data[0].weightKg;
  const last = data[data.length - 1].weightKg;
  const delta = last - first;
  const shown = active !== null ? points[active].entry : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-ink">روند وزن</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            {shown
              ? `${faDate(shown.date, true)} — ${faNumber(shown.weightKg, 1)} کیلوگرم`
              : `${delta <= 0 ? "کاهش" : "افزایش"} ${faNumber(Math.abs(delta), 1)} کیلوگرم در این بازه`}
          </p>
        </div>
        <div className="flex gap-1 rounded-pill border border-line bg-canvas p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setRange(r.key);
                setActive(null);
              }}
              className={cx(
                "rounded-pill px-2.5 py-1 text-[0.6rem] font-bold transition-colors",
                range === r.key ? "bg-surface text-primary-700 shadow-card" : "text-ink-muted",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* The time axis runs left→right; the SVG opts out of the page's RTL so
          text anchors and label placement stay predictable. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ direction: "ltr" }}
        role="img"
        aria-label="نمودار روند وزن"
      >
        <defs>
          <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Target line */}
        <line
          x1={pad.left}
          x2={W - pad.right}
          y1={targetY}
          y2={targetY}
          stroke="#0284C7"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.7"
        />
        <text x={pad.left + 2} y={targetY - 6} textAnchor="start" className="fill-sky-600" fontSize="9">
          هدف {faNumber(targetKg, 0)}
        </text>

        <motion.path
          d={area}
          fill="url(#weight-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={active === i ? 5 : 3}
              fill={active === i ? "#047857" : "#FFFFFF"}
              stroke="#059669"
              strokeWidth="2"
            />
            {/* Generous invisible hit area for touch. */}
            <rect
              x={p.x - 12}
              y={0}
              width={24}
              height={H}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          </g>
        ))}

        <text x={pad.left} y={H - 5} fontSize="9" textAnchor="start" className="fill-slate-400">
          {faDate(data[0].date)}
        </text>
        <text x={W - pad.right} y={H - 5} fontSize="9" textAnchor="end" className="fill-slate-400">
          {faDate(data[data.length - 1].date)}
        </text>
      </svg>

      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line">
        <Cell label="شروع" value={`${faNumber(first, 1)}`} />
        <Cell label="فعلی" value={`${faNumber(last, 1)}`} tone="primary" />
        <Cell label="هدف" value={`${faNumber(targetKg, 1)}`} tone="sky" />
      </div>
    </Card>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "primary" | "sky" }) {
  const color = tone === "primary" ? "text-primary-700" : tone === "sky" ? "text-sky-700" : "text-ink";
  return (
    <div className="text-center">
      <p className={cx("text-sm font-extrabold", color)}>
        {value}
        <span className="mr-0.5 text-2xs font-medium text-ink-soft">kg</span>
      </p>
      <p className="mt-0.5 text-2xs text-ink-muted">{label}</p>
    </div>
  );
}
