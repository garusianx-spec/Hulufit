"use client";

import { motion } from "framer-motion";
import { clamp, cx } from "@/lib/format";

interface RingSegment {
  value: number;
  color: string;
  label?: string;
}

interface ProgressRingProps {
  /** 0..100 for a single ring, or multiple concentric segments. */
  value?: number;
  segments?: RingSegment[];
  size?: number;
  thickness?: number;
  trackColor?: string;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Animated SVG compliance ring. Supports concentric multi-metric mode. */
export function ProgressRing({
  value = 0,
  segments,
  size = 168,
  thickness = 12,
  trackColor = "#E2E8F0",
  color = "#059669",
  children,
  className,
}: ProgressRingProps) {
  const rings = segments ?? [{ value, color }];

  return (
    <div className={cx("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((ring, index) => {
          const radius = size / 2 - thickness / 2 - index * (thickness + 5);
          const circumference = 2 * Math.PI * radius;
          const pct = clamp(ring.value, 0, 100);
          return (
            <g key={index}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={trackColor}
                strokeWidth={thickness}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
