"use client";

import { motion } from "framer-motion";
import { Card, Sep } from "@/components/ui/Bits";
import { bmi, bmiBand } from "@/lib/mock/user";
import { clamp, faNumber } from "@/lib/format";

const BANDS = [
  { max: 18.5, color: "#38BDF8", label: "کمبود" },
  { max: 25, color: "#059669", label: "نرمال" },
  { max: 30, color: "#F59E0B", label: "اضافه" },
  { max: 40, color: "#EF4444", label: "چاقی" },
];

/** Semicircular BMI gauge with the clinical bands laid out behind the needle. */
export function BmiGauge({ weightKg, heightCm }: { weightKg: number; heightCm: number }) {
  const value = bmi(weightKg, heightCm);
  const band = bmiBand(value);
  const pct = clamp((value - 14) / (40 - 14), 0, 1);
  const angle = -90 + pct * 180;

  const R = 74;
  const cx = 100;
  const cy = 92;

  const arc = (from: number, to: number) => {
    const a1 = Math.PI * (1 - from);
    const a2 = Math.PI * (1 - to);
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy - R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2);
    const y2 = cy - R * Math.sin(a2);
    return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  let cursor = 0;

  return (
    <Card className="flex flex-col items-center gap-1">
      <p className="self-start text-sm font-extrabold text-ink">شاخص توده بدنی (BMI)</p>

      <svg viewBox="0 0 200 116" className="w-full max-w-[260px]" role="img" aria-label={`BMI ${value.toFixed(1)}`}>
        {BANDS.map((b) => {
          const from = cursor;
          const to = clamp((b.max - 14) / (40 - 14), 0, 1);
          cursor = to;
          return (
            <path
              key={b.label}
              d={arc(from, to)}
              stroke={b.color}
              strokeWidth="13"
              fill="none"
              strokeLinecap="butt"
              opacity="0.85"
            />
          );
        })}

        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          /* SVG needs transform-box so the pivot is read in viewBox units. */
          style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px` }}
        >
          <line x1={cx} y1={cy} x2={cx} y2={cy - R + 10} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
        <circle cx={cx} cy={cy} r="6" fill="#0F172A" />
      </svg>

      <p className="-mt-2 text-2xl font-extrabold text-ink">{faNumber(value, 1)}</p>
      <span
        className="rounded-pill px-3 py-1 text-2xs font-bold"
        style={{
          background:
            band.tone === "primary"
              ? "#ECFDF5"
              : band.tone === "sky"
                ? "#F0F9FF"
                : band.tone === "warn"
                  ? "#FFFBEB"
                  : "#FEF2F2",
          color:
            band.tone === "primary"
              ? "#047857"
              : band.tone === "sky"
                ? "#0369A1"
                : band.tone === "warn"
                  ? "#D97706"
                  : "#DC2626",
        }}
      >
        {band.label}
      </span>
      <p className="mt-1 text-center text-2xs leading-5 text-ink-muted">
        قد {faNumber(heightCm)} سانتی‌متر
        <Sep />
        وزن {faNumber(weightKg, 1)} کیلوگرم
      </p>
    </Card>
  );
}
