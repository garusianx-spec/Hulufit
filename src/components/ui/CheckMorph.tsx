"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cx } from "@/lib/format";

/**
 * An empty ring that morphs into a filled tick.
 *
 * The fill grows from the centre and the tick draws itself, so completing an
 * item reads as one gesture rather than an icon swap. Purely decorative — the
 * control that owns it carries the label and the checked state.
 */

const TONES = {
  primary: "#059669",
  sky: "#0284C7",
} as const;

export type CheckTone = keyof typeof TONES;

export function CheckMorph({
  done,
  size = 22,
  tone = "primary",
  className,
}: {
  done: boolean;
  size?: number;
  tone?: CheckTone;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const accent = TONES[tone];
  const spring = reduced
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness: 520, damping: 28 } as const);

  return (
    <span
      aria-hidden
      className={cx("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10.8"
          stroke={done ? accent : "#CBD5E1"}
          strokeWidth="1.8"
          className="transition-colors duration-200"
        />
        <motion.circle
          cx="12"
          cy="12"
          r="10.8"
          fill={accent}
          initial={false}
          animate={{ scale: done ? 1 : 0 }}
          // framer-motion cannot infer an SVG origin; set it explicitly.
          style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
          transition={spring}
        />
        <motion.path
          d="m7 12.3 3.4 3.4L17 8.8"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, delay: done ? 0.06 : 0 }}
        />
      </svg>

      {/* One ripple out of the ring the moment it is ticked. */}
      <motion.span
        key={done ? "on" : "off"}
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 2px ${accent}` }}
        initial={false}
        animate={done && !reduced ? { scale: [1, 1.55], opacity: [0.5, 0] } : { opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
    </span>
  );
}
