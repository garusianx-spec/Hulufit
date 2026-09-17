"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckBubble, Sep } from "@/components/ui/Bits";
import { ChevronDown, ClockIcon, SwapIcon } from "@/components/ui/Icons";
import { MEAL_SLOT_META } from "@/lib/mock/diet";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber } from "@/lib/format";
import type { FoodItem, Meal } from "@/types";

interface Props {
  meal: Meal;
  onSwap: (item: FoodItem) => void;
  defaultOpen?: boolean;
}

/** One meal: calorie/macro counter, per-item checkboxes and the swap action. */
export function MealCard({ meal, onSwap, defaultOpen = false }: Props) {
  const { mealDone, swaps, dispatch } = useAppStore();
  const [expanded, setExpanded] = useState(defaultOpen);

  const done = mealDone[meal.id] ?? [];
  const meta = MEAL_SLOT_META[meal.slot];

  // A swapped item contributes its replacement's calories, not the original's.
  const effective = (fi: FoodItem) => swaps[fi.id]?.calories ?? fi.calories;
  const totals = meal.items.reduce(
    (acc, fi) => ({
      calories: acc.calories + effective(fi),
      protein: acc.protein + fi.macros.protein,
      carbs: acc.carbs + fi.macros.carbs,
      fat: acc.fat + fi.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const allDone = done.length === meal.items.length && meal.items.length > 0;
  const itemIds = meal.items.map((i) => i.id);

  return (
    <motion.article layout className="app-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-pill text-lg", meta.accent)}>
          {meta.icon}
        </span>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-right"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-1.5">
            <p className={cx("truncate text-sm font-extrabold", allDone ? "text-ink-soft line-through" : "text-ink")}>
              {meal.title}
            </p>
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-ink-soft">
              <ChevronDown width={16} height={16} />
            </motion.span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-2xs text-ink-muted">
            <ClockIcon width={12} height={12} />
            {meal.timeHint}
            <Sep />
            {faNumber(totals.calories)} کالری
          </p>
        </button>

        <CheckBubble
          checked={allDone}
          label={`تکمیل ${meal.title}`}
          onChange={() =>
            dispatch({ type: "meal/toggleAll", mealId: meal.id, itemIds, calories: totals.calories })
          }
        />
      </div>

      {/* Macro counter strip */}
      <div className="flex items-center gap-2 border-t border-line bg-canvas px-4 py-2">
        <MacroPill label="پروتئین" value={totals.protein} tone="primary" />
        <MacroPill label="کربوهیدرات" value={totals.carbs} tone="sky" />
        <MacroPill label="چربی" value={totals.fat} tone="warn" />
        <span className="mr-auto text-2xs font-bold text-ink-muted">
          {faNumber(done.length)}/{faNumber(meal.items.length)} خورده شد
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-line">
              {meal.items.map((foodItem) => {
                const swapped = swaps[foodItem.id];
                const checked = done.includes(foodItem.id);
                return (
                  <li key={foodItem.id} className="flex items-center gap-3 px-4 py-3">
                    <CheckBubble
                      size={22}
                      checked={checked}
                      label={`خوردن ${foodItem.name}`}
                      onChange={() =>
                        dispatch({
                          type: "meal/toggleItem",
                          mealId: meal.id,
                          itemId: foodItem.id,
                          calories: effective(foodItem),
                        })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cx(
                          "truncate text-xs font-bold",
                          checked ? "text-ink-soft line-through" : "text-ink",
                        )}
                      >
                        {swapped?.name ?? foodItem.name}
                      </p>
                      <p className="mt-0.5 text-2xs text-ink-muted">
                        {foodItem.amount}
                        {swapped && (
                          <span className="mr-1.5 rounded-pill bg-primary-50 px-1.5 py-0.5 text-[0.58rem] font-bold text-primary-700">
                            جایگزین شده
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-2xs font-extrabold text-ink">
                      {faNumber(effective(foodItem))}
                    </p>
                    {foodItem.swappable && (
                      <button
                        type="button"
                        onClick={() => onSwap(foodItem)}
                        aria-label={`جایگزین برای ${foodItem.name}`}
                        className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-line text-sky-600 transition-colors active:bg-sky-50"
                      >
                        <SwapIcon width={16} height={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {meal.note && (
              <p className="border-t border-line bg-primary-50/60 px-4 py-2.5 text-2xs leading-5 text-primary-800">
                💡 {meal.note}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function MacroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "sky" | "warn";
}) {
  const color = {
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
  }[tone];
  return (
    <span className="flex items-baseline gap-1 text-2xs">
      <span className="text-ink-soft">{label}</span>
      <span className={cx("font-extrabold", color)}>{faNumber(value)} گرم</span>
    </span>
  );
}
