"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, SwapIcon } from "@/components/ui/Icons";
import { foodAlternatives } from "@/lib/mock/diet";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faNumber } from "@/lib/format";
import type { FoodAlternative, FoodItem } from "@/types";

/**
 * "Food Swap" — offers isocaloric, macro-matched alternatives for one item.
 * Selection is stored in the app store so the meal card re-renders with the
 * replacement and the day's calorie math stays correct.
 */
export function FoodSwapSheet({
  item,
  open,
  onClose,
}: {
  item: FoodItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { dispatch } = useAppStore();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo<FoodAlternative[]>(() => {
    if (!item) return [];
    return foodAlternatives[item.id] ?? [];
  }, [item]);

  const apply = () => {
    const choice = options.find((o) => o.id === selected);
    if (!item || !choice) return;
    dispatch({ type: "meal/swap", itemId: item.id, name: choice.name, calories: choice.calories });
    toast.success(`«${item.name}» با «${choice.name}» جایگزین شد.`);
    setSelected(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        setSelected(null);
        onClose();
      }}
      title="جایگزین هوشمند غذا"
      subtitle={item ? `گزینه‌های هم‌کالری برای «${item.name}»` : undefined}
      footer={
        <button
          type="button"
          onClick={apply}
          disabled={!selected}
          className={cx("app-btn-primary w-full", !selected && "opacity-40 shadow-none")}
        >
          <SwapIcon width={18} height={18} />
          اعمال جایگزین
        </button>
      }
    >
      {item && (
        <div className="mb-3 rounded-card border border-line bg-canvas p-3">
          <p className="text-2xs text-ink-muted">گزینه فعلی</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">
              {item.name} <span className="text-2xs font-medium text-ink-muted">({item.amount})</span>
            </p>
            <p className="text-xs font-extrabold text-ink">{faNumber(item.calories)} کالری</p>
          </div>
        </div>
      )}

      {options.length === 0 ? (
        <p className="py-8 text-center text-xs text-ink-muted">
          برای این ماده غذایی جایگزین ثبت‌شده‌ای وجود ندارد. از مربی خود بخواهید گزینه اضافه کند.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 pb-2">
          {options.map((option) => {
            const isSelected = selected === option.id;
            const diff = item ? option.calories - item.calories : 0;
            return (
              <li key={option.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelected(option.id)}
                  className={cx(
                    "w-full rounded-card border p-3 text-right transition-colors",
                    isSelected ? "border-primary-600 bg-primary-50" : "border-line bg-surface",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cx(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                        isSelected ? "border-primary-600 bg-primary-600 text-white" : "border-line",
                      )}
                    >
                      {isSelected && <CheckIcon width={12} height={12} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-bold text-ink">{option.name}</p>
                        <p className="shrink-0 text-xs font-extrabold text-ink">
                          {faNumber(option.calories)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-2xs text-ink-muted">{option.amount}</p>
                      <p className="mt-1.5 text-2xs leading-4 text-primary-700">{option.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <MacroTag label="پروتئین" value={option.macros.protein} />
                        <MacroTag label="کربو" value={option.macros.carbs} />
                        <MacroTag label="چربی" value={option.macros.fat} />
                        {diff !== 0 && (
                          <span
                            className={cx(
                              "rounded-pill px-2 py-0.5 text-[0.6rem] font-bold",
                              Math.abs(diff) <= 20
                                ? "bg-primary-50 text-primary-700"
                                : "bg-warn-50 text-warn-600",
                            )}
                          >
                            <span dir="ltr">
                              {diff > 0 ? "+" : "−"}
                              {faNumber(Math.abs(diff))}
                            </span>{" "}
                            کالری
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function MacroTag({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-pill bg-canvas px-2 py-0.5 text-[0.6rem] font-medium text-ink-muted">
      {label} {faNumber(value)} گرم
    </span>
  );
}
