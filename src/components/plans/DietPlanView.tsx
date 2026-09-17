"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, ProgressBar, Sep } from "@/components/ui/Bits";
import { MealCard } from "./MealCard";
import { FoodSwapSheet } from "./FoodSwapSheet";
import { dietPlan } from "@/lib/mock/diet";
import { useAppStore } from "@/lib/store/AppStore";
import { clamp, faNumber, toFa } from "@/lib/format";
import type { FoodItem } from "@/types";

/** Sub-tab 1 — the day's categorized meals with macros, checks and swaps. */
export function DietPlanView() {
  const { mealDone, swaps, user, today } = useAppStore();
  const [swapTarget, setSwapTarget] = useState<FoodItem | null>(null);

  const effective = (fi: FoodItem) => swaps[fi.id]?.calories ?? fi.calories;

  const consumed = dietPlan.meals.reduce((sum, meal) => {
    const done = mealDone[meal.id] ?? [];
    return sum + meal.items.filter((i) => done.includes(i.id)).reduce((s, i) => s + effective(i), 0);
  }, 0);

  const planned = dietPlan.meals.reduce(
    (sum, meal) => sum + meal.items.reduce((s, i) => s + effective(i), 0),
    0,
  );

  const macrosEaten = dietPlan.meals.reduce(
    (acc, meal) => {
      const done = mealDone[meal.id] ?? [];
      for (const i of meal.items.filter((x) => done.includes(x.id))) {
        acc.protein += i.macros.protein;
        acc.carbs += i.macros.carbs;
        acc.fat += i.macros.fat;
      }
      return acc;
    },
    { protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="flex flex-col gap-3 px-4">
      {/* Plan header */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">{dietPlan.title}</p>
            <p className="mt-0.5 text-2xs text-ink-muted">
              تنظیم‌شده توسط {dietPlan.issuedBy}
              <Sep />
              اعتبار تا {toFa(dietPlan.validUntil)}
            </p>
          </div>
          <span className="app-chip app-chip-active shrink-0">فعال</span>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-2xs text-ink-muted">کالری دریافتی از برنامه</p>
            <p className="text-xs font-extrabold text-ink">
              {faNumber(consumed)} / {faNumber(planned)}
            </p>
          </div>
          <ProgressBar value={clamp((consumed / planned) * 100, 0, 100)} height={10} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MacroMeter
            label="پروتئین"
            eaten={macrosEaten.protein}
            target={user.macroTarget.protein}
            tone="primary"
          />
          <MacroMeter label="کربوهیدرات" eaten={macrosEaten.carbs} target={user.macroTarget.carbs} tone="sky" />
          <MacroMeter label="چربی" eaten={macrosEaten.fat} target={user.macroTarget.fat} tone="warn" />
        </div>

        <p className="rounded-card bg-canvas px-3 py-2 text-2xs leading-5 text-ink-muted">
          مجموع سوخت‌وساز امروز: {faNumber(today.caloriesBurned)} کالری سوزانده‌شده
          <Sep />
          هدف روزانه{" "}
          {faNumber(user.dailyCalorieTarget)} کالری
        </p>
      </Card>

      {/* Meals */}
      <motion.div layout className="flex flex-col gap-2.5">
        {dietPlan.meals.map((meal, index) => (
          <MealCard key={meal.id} meal={meal} defaultOpen={index === 0} onSwap={setSwapTarget} />
        ))}
      </motion.div>

      <FoodSwapSheet item={swapTarget} open={Boolean(swapTarget)} onClose={() => setSwapTarget(null)} />
    </div>
  );
}

function MacroMeter({
  label,
  eaten,
  target,
  tone,
}: {
  label: string;
  eaten: number;
  target: number;
  tone: "primary" | "sky" | "warn";
}) {
  return (
    <div className="rounded-card border border-line p-2.5">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-xs font-extrabold text-ink">
        {faNumber(eaten)}
        <span className="text-2xs font-medium text-ink-soft"> / {faNumber(target)} گرم</span>
      </p>
      <ProgressBar value={clamp((eaten / target) * 100, 0, 100)} tone={tone} height={5} className="mt-1.5" />
    </div>
  );
}
