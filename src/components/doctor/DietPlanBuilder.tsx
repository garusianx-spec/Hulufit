"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, ProgressBar, Sep } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, ChevronDown, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/Icons";
import { FOOD_LIBRARY, FOOD_TAGS } from "@/lib/mock/library";
import { MEAL_SLOT_META } from "@/lib/mock/diet";
import { splitToMacros } from "@/lib/health/calc";
import { useAppStore } from "@/lib/store/AppStore";
import { clamp, cx, faNumber } from "@/lib/format";
import type { DietDraft, DraftMeal, DraftMealItem, MealSlot, Patient } from "@/types";

const SLOTS: Array<{ slot: MealSlot; timeHint: string }> = [
  { slot: "breakfast", timeHint: "۷:۰۰ تا ۸:۳۰" },
  { slot: "morningSnack", timeHint: "۱۰:۳۰" },
  { slot: "lunch", timeHint: "۱۳:۰۰ تا ۱۴:۰۰" },
  { slot: "afternoonSnack", timeHint: "۱۷:۰۰" },
  { slot: "dinner", timeHint: "۲۰:۰۰ تا ۲۱:۰۰" },
];

function emptyDraft(patientId: string, calories: number): DietDraft {
  return {
    patientId,
    dailyCalories: calories,
    split: { carbs: 40, protein: 30, fat: 30 },
    meals: SLOTS.map(({ slot, timeHint }) => ({ slot, timeHint, items: [], note: "" })),
    updatedAt: new Date().toISOString(),
  };
}

/** Assign meals, set the calorie ceiling and split the macros. */
export function DietPlanBuilder({ patient }: { patient: Patient }) {
  const toast = useToast();
  const { doctor, dispatch } = useAppStore();

  const [draft, setDraft] = useState<DietDraft>(
    () => doctor.diet[patient.id] ?? emptyDraft(patient.id, 1650),
  );
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);
  const [expanded, setExpanded] = useState<MealSlot | null>("breakfast");

  const targetMacros = useMemo(
    () => splitToMacros(draft.split, draft.dailyCalories),
    [draft.split, draft.dailyCalories],
  );

  const assigned = useMemo(() => {
    let calories = 0;
    const macros = { protein: 0, carbs: 0, fat: 0 };
    for (const meal of draft.meals) {
      for (const item of meal.items) {
        calories += item.calories;
        macros.protein += item.macros.protein;
        macros.carbs += item.macros.carbs;
        macros.fat += item.macros.fat;
      }
    }
    return { calories, macros };
  }, [draft.meals]);

  const patchMeal = (slot: MealSlot, next: Partial<DraftMeal>) =>
    setDraft((d) => ({
      ...d,
      meals: d.meals.map((m) => (m.slot === slot ? { ...m, ...next } : m)),
    }));

  const addItem = (slot: MealSlot, item: DraftMealItem) =>
    patchMeal(slot, {
      items: [
        ...(draft.meals.find((m) => m.slot === slot)?.items ?? []),
        { ...item, id: `${item.id}_${Date.now()}` },
      ],
    });

  const removeItem = (slot: MealSlot, itemId: string) =>
    patchMeal(slot, {
      items: (draft.meals.find((m) => m.slot === slot)?.items ?? []).filter((i) => i.id !== itemId),
    });

  /**
   * Macro sliders always total 100: moving one absorbs the difference from the
   * other two in proportion, so the specialist never has to do the arithmetic.
   */
  const setSplit = (key: "carbs" | "protein" | "fat", value: number) => {
    setDraft((d) => {
      const next = clamp(Math.round(value), 10, 70);
      const others = (["carbs", "protein", "fat"] as const).filter((k) => k !== key);
      const remaining = 100 - next;
      const currentOthers = others.reduce((sum, k) => sum + d.split[k], 0) || 1;
      const split = { ...d.split, [key]: next };
      others.forEach((k, index) => {
        split[k] =
          index === others.length - 1
            ? Math.max(5, 100 - next - split[others[0]])
            : Math.max(5, Math.round((d.split[k] / currentOthers) * remaining));
      });
      return { ...d, split };
    });
  };

  const save = () => {
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(saved);
    dispatch({ type: "doctor/saveDiet", draft: saved });
    toast.success(`برنامه غذایی ${patient.firstName} ذخیره شد.`);
  };

  const caloriePct = clamp((assigned.calories / Math.max(1, draft.dailyCalories)) * 100, 0, 100);
  const over = assigned.calories > draft.dailyCalories;

  return (
    <div className="flex flex-col gap-3">
      {/* Calorie ceiling */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-extrabold text-ink">سقف کالری روزانه</p>
          <p className={cx("text-sm font-extrabold", over ? "text-danger-600" : "text-primary-700")}>
            {faNumber(assigned.calories)}
            <span className="text-2xs font-medium text-ink-soft"> / {faNumber(draft.dailyCalories)}</span>
          </p>
        </div>

        <input
          type="range"
          min={1000}
          max={3500}
          step={50}
          value={draft.dailyCalories}
          onChange={(e) => setDraft((d) => ({ ...d, dailyCalories: Number(e.target.value) }))}
          aria-label="سقف کالری روزانه"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-line accent-primary-600"
        />

        <ProgressBar value={caloriePct} tone={over ? "danger" : "primary"} height={8} />
        <p className="text-2xs text-ink-muted">
          {over
            ? `${faNumber(assigned.calories - draft.dailyCalories)} کیلوکالری بیش از سقف تعیین‌شده`
            : `${faNumber(draft.dailyCalories - assigned.calories)} کیلوکالری تا سقف باقی مانده`}
        </p>
      </Card>

      {/* Macro split */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-extrabold text-ink">تقسیم درشت‌مغذی‌ها</p>
          <p className="text-2xs text-ink-soft">
            مجموع {faNumber(draft.split.carbs + draft.split.protein + draft.split.fat)}٪
          </p>
        </div>

        <MacroSlider
          label="کربوهیدرات"
          tone="sky"
          percent={draft.split.carbs}
          grams={targetMacros.carbs}
          assigned={assigned.macros.carbs}
          onChange={(v) => setSplit("carbs", v)}
        />
        <MacroSlider
          label="پروتئین"
          tone="primary"
          percent={draft.split.protein}
          grams={targetMacros.protein}
          assigned={assigned.macros.protein}
          onChange={(v) => setSplit("protein", v)}
        />
        <MacroSlider
          label="چربی"
          tone="warn"
          percent={draft.split.fat}
          grams={targetMacros.fat}
          assigned={assigned.macros.fat}
          onChange={(v) => setSplit("fat", v)}
        />
      </Card>

      {/* Meals */}
      {draft.meals.map((meal) => {
        const meta = MEAL_SLOT_META[meal.slot];
        const isOpen = expanded === meal.slot;
        const mealCalories = meal.items.reduce((sum, i) => sum + i.calories, 0);

        return (
          <motion.div key={meal.slot} layout className="app-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-pill text-lg", meta.accent)}>
                {meta.icon}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : meal.slot)}
                className="min-w-0 flex-1 text-right"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-extrabold text-ink">{meta.label}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-ink-soft">
                    <ChevronDown width={14} height={14} />
                  </motion.span>
                </span>
                <span className="mt-0.5 block text-2xs text-ink-muted">
                  {meal.timeHint}
                  <Sep />
                  {faNumber(meal.items.length)} قلم
                  <Sep />
                  {faNumber(mealCalories)} کالری
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPickerSlot(meal.slot)}
                aria-label={`افزودن به ${meta.label}`}
                className="tap-target grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary-600 text-white active:scale-95"
              >
                <PlusIcon width={17} height={17} />
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
                  {meal.items.length === 0 ? (
                    <p className="px-3.5 py-4 text-center text-2xs text-ink-soft">
                      هنوز ماده‌ی غذایی اضافه نشده است.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {meal.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-2xs font-bold text-ink">{item.name}</p>
                            <p className="mt-0.5 text-[0.6rem] text-ink-muted">
                              {item.amount}
                              <Sep />
                              پروتئین {faNumber(item.macros.protein)} گرم
                              <Sep />
                              کربو {faNumber(item.macros.carbs)} گرم
                            </p>
                          </div>
                          <span className="shrink-0 text-2xs font-extrabold text-ink">
                            {faNumber(item.calories)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(meal.slot, item.id)}
                            aria-label={`حذف ${item.name}`}
                            className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill text-danger-600"
                          >
                            <TrashIcon width={15} height={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="border-t border-line p-3">
                    <input
                      value={meal.note}
                      onChange={(e) => patchMeal(meal.slot, { note: e.target.value })}
                      placeholder="یادداشت برای مراجع (اختیاری)…"
                      className="w-full rounded-card border border-line bg-canvas px-3 py-2 text-2xs text-ink outline-none placeholder:text-ink-soft focus:border-primary-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <button type="button" onClick={save} className="app-btn-primary w-full">
        <CheckIcon width={17} height={17} />
        ذخیره برنامه غذایی
      </button>

      <FoodPicker
        open={pickerSlot !== null}
        slotLabel={pickerSlot ? MEAL_SLOT_META[pickerSlot].label : ""}
        onClose={() => setPickerSlot(null)}
        onPick={(item) => pickerSlot && addItem(pickerSlot, item)}
      />
    </div>
  );
}

/* ------------------------------ macro slider ----------------------------- */

function MacroSlider({
  label,
  tone,
  percent,
  grams,
  assigned,
  onChange,
}: {
  label: string;
  tone: "primary" | "sky" | "warn";
  percent: number;
  grams: number;
  assigned: number;
  onChange: (value: number) => void;
}) {
  const accent = {
    primary: "accent-primary-600",
    sky: "accent-sky-600",
    warn: "accent-warn-500",
  }[tone];
  const text = {
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
  }[tone];

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-2xs text-ink-muted">{label}</span>
        <span className="text-2xs">
          <span className={cx("font-extrabold", text)}>{faNumber(percent)}٪</span>
          <span className="text-ink-soft">
            {" "}
            — هدف {faNumber(grams)} گرم · تخصیص {faNumber(assigned)} گرم
          </span>
        </span>
      </div>
      <input
        type="range"
        min={10}
        max={70}
        step={1}
        value={percent}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`درصد ${label}`}
        className={cx("h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-line", accent)}
      />
      <ProgressBar
        value={clamp((assigned / Math.max(1, grams)) * 100, 0, 100)}
        tone={tone}
        height={4}
        className="mt-1.5"
      />
    </div>
  );
}

/* ------------------------------ food picker ------------------------------ */

function FoodPicker({
  open,
  slotLabel,
  onClose,
  onPick,
}: {
  open: boolean;
  slotLabel: string;
  onClose: () => void;
  onPick: (item: DraftMealItem) => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  // Adding several items to one meal is the common case, so the sheet stays
  // open; this counter is what tells the user it is working.
  const [addedCount, setAddedCount] = useState(0);

  const close = () => {
    setAddedCount(0);
    onClose();
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_LIBRARY.filter((f) => {
      if (tag && !f.tags.includes(tag)) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [query, tag]);

  return (
    <Sheet
      open={open}
      onClose={close}
      title={`افزودن به ${slotLabel}`}
      subtitle={
        addedCount > 0 ? `${faNumber(addedCount)} قلم به این وعده اضافه شد` : "می‌توانید چند قلم انتخاب کنید"
      }
      maxHeight="88vh"
      footer={
        <button type="button" onClick={close} className="app-btn-primary w-full">
          {addedCount > 0 ? `تمام شد — ${faNumber(addedCount)} قلم` : "بستن"}
        </button>
      }
    >
      <div className="flex flex-col gap-2.5 pb-2">
        <div className="flex items-center gap-2 rounded-pill border border-line bg-canvas px-3.5 py-2.5">
          <SearchIcon width={17} height={17} className="shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی ماده غذایی…"
            type="search"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
          />
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {FOOD_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className={cx("app-chip shrink-0", tag === t && "app-chip-active")}
            >
              {t}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-2">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(food);
                  setAddedCount((n) => n + 1);
                  toast.success(`«${food.name}» اضافه شد.`);
                }}
                aria-label={`افزودن ${food.name}`}
                className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface p-3 text-right active:bg-canvas"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink">{food.name}</span>
                  <span className="mt-0.5 block text-2xs text-ink-muted">
                    {food.amount}
                    <Sep />
                    پ {faNumber(food.macros.protein)} · ک {faNumber(food.macros.carbs)} · چ{" "}
                    {faNumber(food.macros.fat)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-extrabold text-ink">{faNumber(food.calories)}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-primary-50 text-primary-700">
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
