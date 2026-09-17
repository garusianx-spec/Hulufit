"use client";

import { motion } from "framer-motion";

/**
 * Lightweight stand-in for the production GIF: a looping figure whose limbs
 * animate, so the preview slot has correct sizing, controls and timing.
 *
 * SVG transforms need `transform-box: view-box` for `transform-origin` to be
 * read in viewBox units — without it every limb rotates about the wrong pivot.
 */
export function MovementLoop({ playing, seed }: { playing: boolean; seed: string }) {
  const phase = seed.charCodeAt(seed.length - 1) % 3;
  const loop = {
    duration: 1.5 + phase * 0.2,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as const,
  };
  const still = { duration: 0.25 };
  const pivot = (x: number, y: number) => ({
    transformBox: "view-box" as const,
    transformOrigin: `${x}px ${y}px`,
  });

  return (
    <svg viewBox="0 0 200 150" className="h-full w-full">
      <defs>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ECFDF5" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill="url(#floor)" />
      <line x1="42" y1="132" x2="158" y2="132" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />

      {/* Whole body dips, as in a squat or a press. */}
      <motion.g animate={playing ? { y: [0, 13, 0] } : { y: 0 }} transition={playing ? loop : still}>
        {/* legs */}
        <motion.rect
          x="92" y="92" width="8" height="38" rx="4" fill="#065F46"
          style={pivot(96, 94)}
          animate={playing ? { rotate: [0, 12, 0] } : { rotate: 0 }}
          transition={playing ? loop : still}
        />
        <motion.rect
          x="100" y="92" width="8" height="38" rx="4" fill="#065F46"
          style={pivot(104, 94)}
          animate={playing ? { rotate: [0, -12, 0] } : { rotate: 0 }}
          transition={playing ? loop : still}
        />

        {/* torso */}
        <rect x="90" y="56" width="20" height="38" rx="9" fill="#047857" />

        {/* arms */}
        <motion.rect
          x="68" y="60" width="24" height="8" rx="4" fill="#0284C7"
          style={pivot(92, 64)}
          animate={playing ? { rotate: [0, -38, 0] } : { rotate: 0 }}
          transition={playing ? loop : still}
        />
        <motion.rect
          x="108" y="60" width="24" height="8" rx="4" fill="#0284C7"
          style={pivot(108, 64)}
          animate={playing ? { rotate: [0, 38, 0] } : { rotate: 0 }}
          transition={playing ? loop : still}
        />

        {/* head */}
        <circle cx="100" cy="44" r="12" fill="#059669" />
      </motion.g>
    </svg>
  );
}
