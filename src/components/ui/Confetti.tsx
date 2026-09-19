"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * A one-shot burst for the moment a day's routine is finished.
 *
 * Deliberately dependency-free: a few dozen absolutely-positioned shards that
 * animate once and unmount. It is `pointer-events: none` and `aria-hidden`, so
 * it can never sit between the user and a control, and `prefers-reduced-motion`
 * renders nothing at all.
 */

/** Emerald, sky and the brand coral — the palette the app already uses. */
const COLORS = ["#059669", "#34D399", "#0284C7", "#38BDF8", "#FF5252", "#F59E0B"];

interface Shard {
  x: number;
  delay: number;
  drift: number;
  spin: number;
  color: string;
  width: number;
  height: number;
  round: boolean;
}

function shards(count: number, seed: number): Shard[] {
  // A tiny LCG, so a burst looks scattered but a re-render does not reshuffle it.
  let state = seed || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: next() * 100,
    delay: next() * 0.25,
    drift: (next() - 0.5) * 120,
    spin: (next() - 0.5) * 720,
    color: COLORS[Math.floor(next() * COLORS.length)] ?? COLORS[0]!,
    width: 6 + next() * 5,
    height: 9 + next() * 8,
    round: next() > 0.65,
  }));
}

export function Confetti({ fire, count = 42 }: { fire: boolean; count?: number }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => shards(count, count * 7919), [count]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {fire && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          {pieces.map((shard, index) => (
            <motion.span
              key={index}
              className="absolute top-[-8%] block"
              style={{
                insetInlineStart: `${shard.x}%`,
                width: shard.width,
                height: shard.height,
                background: shard.color,
                borderRadius: shard.round ? "50%" : 2,
              }}
              initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
              animate={{
                y: "115vh",
                x: shard.drift,
                rotate: shard.spin,
                opacity: [1, 1, 0.9, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.4 + shard.delay,
                delay: shard.delay,
                ease: [0.13, 0.7, 0.4, 1],
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
