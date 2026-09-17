"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { MovementLoop } from "./MovementLoop";
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
