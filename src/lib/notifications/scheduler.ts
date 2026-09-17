import type {
  Meal,
  NotificationChannel,
  ScheduledNotification,
  SupplementItem,
  WorkoutDay,
} from "@/types";
import { faNumber, persianWeekdayIndex, toFa } from "@/lib/format";

/**
 * Turns plan data into the reminders due today.
 *
 * Everything is derived, never stored: recomputing on each tick means an edited
 * plan, a ticked checkbox or a toggled channel takes effect immediately, and a
 * reminder can't be orphaned by stale state.
 */

/** "۸:۳۰" / "۱۷:۰۰" / "۷:۰۰ تا ۸:۳۰" → minutes past midnight, or null. */
export function parseFaTime(label: string): number | null {
  // Take the first clock-like token; ranges fire at their start.
  const normalised = label.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const match = normalised.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function atMinutes(minutes: number, base = new Date()): number {
  const d = new Date(base);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.getTime();
}

/** yyyy-mm-dd, so a key is unique per calendar day. */
function dayStamp(base = new Date()): string {
  return `${base.getFullYear()}-${base.getMonth() + 1}-${base.getDate()}`;
}

interface BuildArgs {
  meals: Meal[];
  /** mealId → itemIds already eaten; a finished meal is not reminded. */
  mealDone: Record<string, string[]>;
  supplements: SupplementItem[];
  workout: WorkoutDay | undefined;
  workoutDone: boolean;
  channels: Record<NotificationChannel, boolean>;
  /** Fire this many minutes before the scheduled time. */
  leadMinutes?: number;
  now?: Date;
}

export function buildTodaysSchedule({
  meals,
  mealDone,
  supplements,
  workout,
  workoutDone,
  channels,
  leadMinutes = 0,
  now = new Date(),
}: BuildArgs): ScheduledNotification[] {
  const stamp = dayStamp(now);
  const out: ScheduledNotification[] = [];
  const lead = leadMinutes * 60_000;

  /* --------------------------------- meals -------------------------------- */
  if (channels.meals) {
    for (const meal of meals) {
      const done = mealDone[meal.id] ?? [];
      if (meal.items.length > 0 && done.length === meal.items.length) continue;

      const minutes = parseFaTime(meal.timeHint);
      if (minutes === null) continue;

      const calories = meal.items.reduce((sum, item) => sum + item.calories, 0);
      out.push({
        key: `meal:${meal.id}:${stamp}`,
        channel: "meals",
        title: `وقت ${meal.title} است 🍽️`,
        body: `${faNumber(calories)} کیلوکالری طبق برنامه امروز شما.`,
        at: atMinutes(minutes, now) - lead,
        url: "/plans?tab=diet",
        actions: [
          { action: "meal-done", title: "خوردم" },
          { action: "snooze", title: "۱۵ دقیقه بعد" },
        ],
      });
    }
  }

  /* ----------------------------- supplements ------------------------------ */
  if (channels.supplements) {
    for (const item of supplements) {
      if (!item.reminderOn || item.takenAt) continue;

      const minutes = parseFaTime(item.timeLabel);
      if (minutes === null) continue;

      out.push({
        key: `supp:${item.id}:${stamp}`,
        channel: "supplements",
        title: `${item.kind === "medicine" ? "یادآور دارو" : "یادآور مکمل"} — ${item.name}`,
        body: `${item.dosage}${item.withFood ? " · همراه غذا" : " · ناشتا"}`,
        at: atMinutes(minutes, now) - lead,
        url: "/plans?tab=supplements",
        actions: [
          { action: "supplement-taken", title: "مصرف کردم" },
          { action: "snooze", title: "۱۵ دقیقه بعد" },
        ],
      });
    }
  }

  /* ------------------------------- workout -------------------------------- */
  if (channels.workout && workout && !workout.isRestDay && !workoutDone) {
    // Sessions are evening by convention; the plan carries no clock field yet.
    const minutes = 17 * 60 + 30;
    out.push({
      key: `workout:${workout.id}:${stamp}`,
      channel: "workout",
      title: `تمرین امروز: ${workout.title} 🏋️`,
      body: `${faNumber(workout.durationMin)} دقیقه · حدود ${faNumber(workout.estimatedBurn)} کیلوکالری`,
      at: atMinutes(minutes, now) - lead,
      url: "/plans?tab=workout",
      actions: [{ action: "open-workout", title: "شروع تمرین" }],
    });
  }

  return out.sort((a, b) => a.at - b.at);
}

/** Today's workout day from the weekly plan. */
export function todaysWorkout(days: WorkoutDay[], now = new Date()): WorkoutDay | undefined {
  const index = persianWeekdayIndex(now);
  return days.find((d) => d.dayIndex === index);
}

/** "۲ ساعت و ۱۵ دقیقه دیگر" — used by the settings sheet preview. */
export function faUntil(at: number, now = Date.now()): string {
  const diff = Math.max(0, at - now);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${toFa(minutes)} دقیقه دیگر`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${toFa(hours)} ساعت دیگر`
    : `${toFa(hours)} ساعت و ${toFa(rest)} دقیقه دیگر`;
}
