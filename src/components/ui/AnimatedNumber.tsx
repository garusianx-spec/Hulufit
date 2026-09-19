"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { faNumber, toFa } from "@/lib/format";

/**
 * A number that springs to its new value instead of snapping.
 *
 * The spring runs on a motion value, so the digits change without React
 * re-rendering on every frame. `prefers-reduced-motion` gets the final value
 * immediately — a counter spinning past is exactly the kind of motion that
 * setting is there to stop.
 */
export function AnimatedNumber({
  value,
  fractionDigits = 0,
  grouping = true,
  className,
}: {
  value: number;
  fractionDigits?: number;
  /** Off for years and codes, where `۱٬۳۹۴` would be wrong. */
  grouping?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 120, damping: 20, mass: 0.7 });

  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [value, reduced, spring]);

  const text = useTransform(spring, (current) =>
    grouping ? faNumber(current, fractionDigits) : toFa(current.toFixed(fractionDigits)),
  );

  // The accessible value is the real one; the animating digits are decoration.
  return (
    <motion.span className={className} aria-label={faNumber(value, fractionDigits)} role="text">
      <motion.span aria-hidden>{text}</motion.span>
    </motion.span>
  );
}
