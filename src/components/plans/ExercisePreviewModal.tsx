"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { PauseIcon, PlayIcon } from "@/components/ui/Icons";
import { MUSCLE_LABELS } from "@/lib/mock/workouts";
import { faNumber } from "@/lib/format";
import type { Exercise } from "@/types";

/**
 * Animated movement preview.
 *
 * `previewUrl` points at a looping GIF/WebP in production; in the demo build
 * it is an inline SVG loop so the bundle ships no binary media. The play/pause
 * control maps 1:1 to `<img>` swap or `<video>` playback in the real app.
 */
export function ExercisePreviewModal({
  exercise,
  open,
  onClose,
}: {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(true);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise?.name}
      subtitle={exercise?.latinName}
      maxHeight="88vh"
    >
      {exercise && (
        <div className="flex flex-col gap-3 pb-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-canvas">
            <MovementLoop playing={playing} seed={exercise.id} />
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? "توقف پیش‌نمایش" : "پخش پیش‌نمایش"}
              className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-pill bg-ink/70 text-white backdrop-blur"
            >
              {playing ? <PauseIcon width={18} height={18} /> : <PlayIcon width={18} height={18} />}
            </button>
            <span className="absolute right-3 top-3 rounded-pill bg-surface/90 px-2.5 py-1 text-2xs font-bold text-ink">
              پیش‌نمایش حرکت
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {exercise.targets.map((t) => (
              <span key={t} className="app-chip">
                {MUSCLE_LABELS[t]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <InfoBox label="ست" value={faNumber(exercise.sets.length)} />
            <InfoBox label="استراحت" value={`${faNumber(exercise.restSeconds)} ثانیه`} />
            <InfoBox label="تمپو" value={exercise.tempo ?? "آزاد"} />
          </div>

          <div className="rounded-card border border-line">
            <p className="border-b border-line px-3 py-2 text-2xs font-bold text-ink">ست‌های امروز</p>
            <ul className="divide-y divide-line">
              {exercise.sets.map((s, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-ink-muted">ست {faNumber(i + 1)}</span>
                  <span className="font-bold text-ink">
                    {faNumber(s.reps)} تکرار
                    {s.weightKg ? ` — ${faNumber(s.weightKg)} کیلوگرم` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {exercise.coachNote && (
            <p className="rounded-card bg-sky-50 px-3 py-2.5 text-2xs leading-5 text-sky-800">
              🎯 {exercise.coachNote}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-2.5 text-center">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-xs font-extrabold text-ink">{value}</p>
    </div>
  );
}

/**
 * Lightweight stand-in for the production GIF: a looping figure whose limbs
 * animate, so the preview slot has correct sizing, controls and timing.
 *
 * SVG transforms need `transform-box: view-box` for `transform-origin` to be
 * read in viewBox units — without it every limb rotates about the wrong pivot.
 */
function MovementLoop({ playing, seed }: { playing: boolean; seed: string }) {
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
