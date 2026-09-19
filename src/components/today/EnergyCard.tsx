"use client";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, ProgressBar } from "@/components/ui/Bits";
import { FireIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { clamp, faNumber } from "@/lib/format";

/** Calories consumed vs. burned, with the net budget left for the day. */
export function EnergyCard() {
  const { today, user } = useAppStore();
  const net = today.caloriesConsumed - today.caloriesBurned;
  const remaining = Math.max(0, user.dailyCalorieTarget - net);
  const pct = clamp((net / user.dailyCalorieTarget) * 100, 0, 100);
  const over = net > user.dailyCalorieTarget;

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-ink">انرژی امروز</p>
          <p className="text-2xs text-ink-muted">هدف روزانه {faNumber(user.dailyCalorieTarget)} کیلوکالری</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-warn-50 text-warn-600">
          <FireIcon width={18} height={18} />
        </span>
      </div>

      <div className="flex items-end gap-1.5">
        <p className={`text-3xl font-extrabold leading-none ${over ? "text-danger-600" : "text-ink"}`}>
          <AnimatedNumber value={remaining} />
        </p>
        <p className="pb-1 text-2xs text-ink-muted">
          {over ? "کیلوکالری فراتر از هدف" : "کیلوکالری باقی‌مانده"}
        </p>
      </div>

      <ProgressBar value={pct} tone={over ? "danger" : "primary"} height={10} />

      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line pt-0.5">
        <div className="text-center">
          <p className="text-sm font-extrabold text-primary-700">
            <AnimatedNumber value={today.caloriesConsumed} />
          </p>
          <p className="mt-0.5 text-2xs text-ink-muted">دریافتی</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-extrabold text-sky-700">
            <AnimatedNumber value={today.caloriesBurned} />
          </p>
          <p className="mt-0.5 text-2xs text-ink-muted">سوزانده</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-extrabold text-ink">
            <AnimatedNumber value={net} />
          </p>
          <p className="mt-0.5 text-2xs text-ink-muted">خالص</p>
        </div>
      </div>
    </Card>
  );
}
