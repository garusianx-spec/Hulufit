"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CheckBubble, ProgressBar, Sep } from "@/components/ui/Bits";
import { ExercisePreviewModal } from "./ExercisePreviewModal";
import { ChevronDown, ClockIcon, FireIcon, PlayIcon } from "@/components/ui/Icons";
import { MUSCLE_LABELS, workoutPlan } from "@/lib/mock/workouts";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber, persianWeekdayIndex, WEEKDAYS_FA } from "@/lib/format";
import type { Exercise, WorkoutDay } from "@/types";

/** Sub-tab 2 — weekly routine, target muscles, sets×reps tracker, previews. */
export function WorkoutPlanView() {
  const todayIndex = persianWeekdayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Late in the week "today" starts off-screen in the RTL strip — bring it in.
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[data-today="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const day = workoutPlan.days.find((d) => d.dayIndex === selectedDay) ?? workoutPlan.days[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="px-4">
        <Card className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">{workoutPlan.title}</p>
            <p className="mt-0.5 text-2xs text-ink-muted">
              {workoutPlan.issuedBy}
              <Sep />
              هفته {workoutPlan.weekOf}
            </p>
          </div>
          <span className="app-chip shrink-0">
            <FireIcon width={13} height={13} />
            {faNumber(workoutPlan.days.reduce((s, d) => s + d.estimatedBurn, 0))} کالری
          </span>
        </Card>
      </div>

      {/* Weekday strip */}
      <div ref={stripRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {workoutPlan.days.map((d) => {
          const active = d.dayIndex === selectedDay;
          const isToday = d.dayIndex === todayIndex;
          return (
            <button
              key={d.id}
              type="button"
              data-today={isToday ? "true" : undefined}
              onClick={() => setSelectedDay(d.dayIndex)}
              className={cx(
                "relative flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-card border px-2 py-2.5 transition-colors",
                active ? "border-primary-600 bg-primary-50" : "border-line bg-surface",
              )}
            >
              <span className={cx("text-2xs font-bold", active ? "text-primary-700" : "text-ink-muted")}>
                {WEEKDAYS_FA[d.dayIndex]}
              </span>
              <span
                className={cx(
                  "text-[0.6rem] leading-tight",
                  d.isRestDay ? "text-ink-soft" : active ? "text-primary-700" : "text-ink",
                )}
              >
                {d.isRestDay ? "استراحت" : `${faNumber(d.exercises.length)} حرکت`}
              </span>
              {isToday && (
                <span className="absolute -top-1 right-1/2 translate-x-1/2 rounded-pill bg-sky-600 px-1.5 text-[0.5rem] font-bold text-white">
                  امروز
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <WorkoutDayPanel day={day} onPreview={setPreview} />
      </div>

      <ExercisePreviewModal exercise={preview} open={Boolean(preview)} onClose={() => setPreview(null)} />
    </div>
  );
}

function WorkoutDayPanel({ day, onPreview }: { day: WorkoutDay; onPreview: (e: Exercise) => void }) {
  const { setDone, workoutDone, dispatch } = useAppStore();

  const allSets = day.exercises.flatMap(
    (e) => setDone[e.id] ?? new Array(e.sets.length).fill(false),
  );
  const completedSets = allSets.filter(Boolean).length;
  const progress = allSets.length ? (completedSets / allSets.length) * 100 : 0;
  const dayDone = Boolean(workoutDone[day.id]);

  if (day.isRestDay) {
    return (
      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">🧘</span>
        <p className="text-sm font-extrabold text-ink">{day.title}</p>
        <p className="max-w-[260px] text-2xs leading-5 text-ink-muted">
          امروز عضلات شما در حال بازسازی هستند. یک پیاده‌روی سبک ۲۰ دقیقه‌ای و کشش کافی است.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">{day.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-ink-muted">
              <ClockIcon width={12} height={12} /> {faNumber(day.durationMin)} دقیقه
              <Sep />
              <FireIcon width={12} height={12} /> {faNumber(day.estimatedBurn)} کالری
            </p>
          </div>
          <CheckBubble
            tone="sky"
            checked={dayDone}
            label="تکمیل تمرین امروز"
            onChange={() => dispatch({ type: "workout/toggleDay", dayId: day.id })}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {day.focus.map((m) => (
            <span key={m} className="app-chip border-sky-200 bg-sky-50 text-sky-700">
              {MUSCLE_LABELS[m]}
            </span>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-2xs text-ink-muted">ست‌های انجام‌شده</p>
            <p className="text-xs font-extrabold text-ink">
              {faNumber(completedSets)} / {faNumber(allSets.length)}
            </p>
          </div>
          <ProgressBar value={progress} tone="sky" height={10} />
        </div>
      </Card>

      {day.exercises.map((exercise) => (
        <ExerciseRow key={exercise.id} exercise={exercise} onPreview={onPreview} />
      ))}
    </div>
  );
}

function ExerciseRow({ exercise, onPreview }: { exercise: Exercise; onPreview: (e: Exercise) => void }) {
  const { setDone, dispatch } = useAppStore();
  const [open, setOpen] = useState(false);
  const flags = setDone[exercise.id] ?? new Array(exercise.sets.length).fill(false);
  const done = flags.filter(Boolean).length;
  const complete = done === exercise.sets.length;

  return (
    <motion.article layout className="app-card overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          onClick={() => onPreview(exercise)}
          aria-label={`پیش‌نمایش ${exercise.name}`}
          className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-card bg-sky-50 text-sky-600"
        >
          <PlayIcon width={18} height={18} />
          <span className="absolute inset-x-0 bottom-0 bg-sky-600/90 py-0.5 text-center text-[0.5rem] font-bold text-white">
            GIF
          </span>
        </button>

        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-right">
          <div className="flex items-center gap-1.5">
            <p className={cx("truncate text-xs font-extrabold", complete ? "text-ink-soft" : "text-ink")}>
              {exercise.name}
            </p>
            <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-soft">
              <ChevronDown width={14} height={14} />
            </motion.span>
          </div>
          <p className="mt-0.5 truncate text-2xs text-ink-muted">
            {exercise.latinName}
            <Sep />
            {exercise.targets.map((t) => MUSCLE_LABELS[t]).join("، ")}
          </p>
        </button>

        <span
          className={cx(
            "shrink-0 rounded-pill px-2 py-1 text-2xs font-extrabold",
            complete ? "bg-primary-50 text-primary-700" : "bg-canvas text-ink-muted",
          )}
        >
          {faNumber(done)}/{faNumber(exercise.sets.length)}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line"
          >
            <ul className="divide-y divide-line">
              {exercise.sets.map((set, index) => (
                <li key={index} className="flex items-center gap-3 px-3.5 py-2.5">
                  <CheckBubble
                    size={22}
                    tone="sky"
                    checked={Boolean(flags[index])}
                    label={`ست ${index + 1}`}
                    onChange={() =>
                      dispatch({
                        type: "exercise/toggleSet",
                        exerciseId: exercise.id,
                        index,
                        total: exercise.sets.length,
                      })
                    }
                  />
                  <span className="flex-1 text-2xs text-ink-muted">ست {faNumber(index + 1)}</span>
                  <span className="text-xs font-extrabold text-ink">{faNumber(set.reps)}</span>
                  <span className="text-2xs text-ink-soft">تکرار</span>
                  {set.weightKg !== undefined && (
                    <>
                      <span className="text-xs font-extrabold text-ink">{faNumber(set.weightKg)}</span>
                      <span className="text-2xs text-ink-soft">کیلو</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line bg-canvas px-3.5 py-2">
              <span className="text-2xs text-ink-muted">
                استراحت بین ست: {faNumber(exercise.restSeconds)} ثانیه
              </span>
              <button
                type="button"
                onClick={() => onPreview(exercise)}
                className="text-2xs font-bold text-sky-700"
              >
                مشاهده ویدیوی حرکت
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
