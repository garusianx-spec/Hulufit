"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Sep } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MovementLoop } from "@/components/plans/MovementLoop";
import { CheckIcon, ChevronDown, MinusIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/Icons";
import { EXERCISE_LIBRARY } from "@/lib/mock/library";
import { MUSCLE_LABELS } from "@/lib/mock/workouts";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber, WEEKDAYS_FA } from "@/lib/format";
import type { DraftExercise, MuscleGroup, Patient, WorkoutDraft } from "@/types";

const MUSCLE_FILTERS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "legs",
  "arms",
  "core",
  "glutes",
  "cardio",
  "fullBody",
];

function emptyDraft(patientId: string, dayIndex: number): WorkoutDraft {
  return {
    patientId,
    dayIndex,
    title: `تمرین ${WEEKDAYS_FA[dayIndex]}`,
    exercises: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Pick exercises, configure sets × reps, rest and per-exercise notes. */
export function WorkoutPlanBuilder({ patient }: { patient: Patient }) {
  const toast = useToast();
  const { doctor, dispatch } = useAppStore();

  const saved = doctor.workout[patient.id];
  const [dayIndex, setDayIndex] = useState(saved?.dayIndex ?? 0);
  const [draft, setDraft] = useState<WorkoutDraft>(() => saved ?? emptyDraft(patient.id, 0));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totals = useMemo(() => {
    const sets = draft.exercises.reduce((sum, e) => sum + e.sets, 0);
    const minutes = draft.exercises.reduce(
      (sum, e) => sum + (e.sets * 45 + e.sets * e.restSeconds) / 60,
      0,
    );
    return { sets, minutes: Math.round(minutes) };
  }, [draft.exercises]);

  const patchExercise = (id: string, next: Partial<DraftExercise>) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...next } : e)),
    }));

  const add = (exercise: Omit<DraftExercise, "note">) =>
    setDraft((d) => ({
      ...d,
      exercises: [...d.exercises, { ...exercise, id: `${exercise.id}_${Date.now()}`, note: "" }],
    }));

  const remove = (id: string) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));

  const changeDay = (next: number) => {
    setDayIndex(next);
    setDraft((d) => ({ ...d, dayIndex: next, title: `تمرین ${WEEKDAYS_FA[next]}` }));
  };

  const save = () => {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(next);
    dispatch({ type: "doctor/saveWorkout", draft: next });
    toast.success(`برنامه تمرینی ${WEEKDAYS_FA[dayIndex]} ذخیره شد.`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Day picker */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {WEEKDAYS_FA.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => changeDay(index)}
            className={cx(
              "shrink-0 rounded-card border px-3.5 py-2 text-2xs font-bold transition-colors",
              index === dayIndex
                ? "border-sky-600 bg-sky-50 text-sky-700"
                : "border-line bg-surface text-ink-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <label htmlFor="workout-title" className="text-xs font-extrabold text-ink">
          عنوان جلسه
        </label>
        <input
          id="workout-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="rounded-card border border-line bg-canvas px-3 py-2.5 text-xs text-ink outline-none focus:border-sky-500"
        />
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line">
          <Stat value={draft.exercises.length} label="حرکت" />
          <Stat value={totals.sets} label="ست" />
          <Stat value={totals.minutes} label="دقیقه تخمینی" />
        </div>
      </Card>

      {draft.exercises.length === 0 && (
        <Card className="py-8 text-center">
          <p className="text-2xs text-ink-soft">هنوز حرکتی به این جلسه اضافه نشده است.</p>
        </Card>
      )}

      {draft.exercises.map((exercise) => {
        const isOpen = expanded === exercise.id;
        return (
          <motion.div key={exercise.id} layout className="app-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-card border border-line bg-canvas">
                <MovementLoop playing={false} seed={exercise.id} />
              </span>

              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : exercise.id)}
                className="min-w-0 flex-1 text-right"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-extrabold text-ink">{exercise.name}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-ink-soft">
                    <ChevronDown width={14} height={14} />
                  </motion.span>
                </span>
                <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                  {faNumber(exercise.sets)} × {faNumber(exercise.reps)}
                  <Sep />
                  استراحت {faNumber(exercise.restSeconds)} ثانیه
                  {exercise.weightKg ? (
                    <>
                      <Sep />
                      {faNumber(exercise.weightKg)} کیلوگرم
                    </>
                  ) : null}
                </span>
              </button>

              <button
                type="button"
                onClick={() => remove(exercise.id)}
                aria-label={`حذف ${exercise.name}`}
                className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill text-danger-600"
              >
                <TrashIcon width={15} height={15} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-line"
                >
                  <div className="aspect-[4/3] max-h-44 w-full border-b border-line bg-canvas">
                    <MovementLoop playing seed={exercise.id} />
                  </div>

                  <div className="flex flex-col gap-2.5 p-3.5">
                    <Stepper
                      label="تعداد ست"
                      value={exercise.sets}
                      min={1}
                      max={10}
                      onChange={(sets) => patchExercise(exercise.id, { sets })}
                    />
                    <Stepper
                      label="تکرار در هر ست"
                      value={exercise.reps}
                      min={1}
                      max={60}
                      onChange={(reps) => patchExercise(exercise.id, { reps })}
                    />
                    <Stepper
                      label="استراحت (ثانیه)"
                      value={exercise.restSeconds}
                      min={0}
                      max={180}
                      step={15}
                      onChange={(restSeconds) => patchExercise(exercise.id, { restSeconds })}
                    />
                    <Stepper
                      label="وزنه (کیلوگرم)"
                      value={exercise.weightKg ?? 0}
                      min={0}
                      max={200}
                      step={2.5}
                      decimals={1}
                      onChange={(weightKg) => patchExercise(exercise.id, { weightKg })}
                    />

                    <input
                      value={exercise.note}
                      onChange={(e) => patchExercise(exercise.id, { note: e.target.value })}
                      placeholder="یادداشت فرم حرکت برای مراجع…"
                      className="rounded-card border border-line bg-canvas px-3 py-2 text-2xs text-ink outline-none placeholder:text-ink-soft focus:border-sky-500"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {exercise.targets.map((t) => (
                        <span key={t} className="app-chip">
                          {MUSCLE_LABELS[t]}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <div className="flex gap-2">
        <button type="button" onClick={() => setPickerOpen(true)} className="app-btn-ghost flex-1">
          <PlusIcon width={17} height={17} />
          افزودن حرکت
        </button>
        <button type="button" onClick={save} className="app-btn-sky flex-1">
          <CheckIcon width={17} height={17} />
          ذخیره جلسه
        </button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={add} />
    </div>
  );
}

/* --------------------------------- bits ---------------------------------- */

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-extrabold text-ink">{faNumber(value)}</p>
      <p className="mt-0.5 text-[0.58rem] text-ink-muted">{label}</p>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(decimals))));
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-1 text-2xs text-ink-muted">{label}</span>
      <button
        type="button"
        aria-label={`کم کردن ${label}`}
        onClick={() => onChange(clamp(value - step))}
        className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
      >
        <MinusIcon width={15} height={15} />
      </button>
      <span className="w-12 text-center text-xs font-extrabold text-ink">{faNumber(value, decimals)}</span>
      <button
        type="button"
        aria-label={`زیاد کردن ${label}`}
        onClick={() => onChange(clamp(value + step))}
        className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
      >
        <PlusIcon width={15} height={15} />
      </button>
    </div>
  );
}

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: Omit<DraftExercise, "note">) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((e) => {
      if (muscle && !e.targets.includes(muscle)) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.latinName.toLowerCase().includes(q);
    });
  }, [muscle, query]);

  return (
    <Sheet open={open} onClose={onClose} title="کتابخانه حرکات" maxHeight="88vh">
      <div className="flex flex-col gap-2.5 pb-2">
        <div className="flex items-center gap-2 rounded-pill border border-line bg-canvas px-3.5 py-2.5">
          <SearchIcon width={17} height={17} className="shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی حرکت…"
            type="search"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
          />
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(muscle === m ? null : m)}
              className={cx("app-chip shrink-0", muscle === m && "app-chip-active")}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-2">
          {results.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(exercise);
                  onClose();
                }}
                aria-label={`افزودن ${exercise.name}`}
                className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface p-2.5 text-right active:bg-canvas"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-card bg-canvas">
                  <MovementLoop playing={false} seed={exercise.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink">{exercise.name}</span>
                  <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                    {exercise.latinName}
                    <Sep />
                    {exercise.targets.map((t) => MUSCLE_LABELS[t]).join("، ")}
                  </span>
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-sky-50 text-sky-700">
                  <PlusIcon width={15} height={15} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
