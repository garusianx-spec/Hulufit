"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChoiceCard, NumberField, SegmentedPair, TogglePill } from "./Pieces";
import { Card, ProgressBar, Sep } from "@/components/ui/Bits";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { BrandLockup } from "@/components/layout/Logo";
import { useToast } from "@/components/ui/Toast";
import { ChevronLeft, ChevronRight, ShieldIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import {
  ACTIVITY_META,
  ALLERGY_LABELS,
  CONDITION_LABELS,
  GOAL_META,
  ageFromBirthYear,
  bmiBand,
  currentJalaliYear,
  computeTargets,
  needsClinicalReview,
} from "@/lib/health/calc";
import { cx, faNumber, toFa } from "@/lib/format";
import type { ActivityLevel, AllergyKey, Assessment, Gender, HealthGoal, MedicalConditionKey } from "@/types";

const STEPS = [
  { key: "bio", label: "مشخصات بدنی" },
  { key: "activity", label: "سطح فعالیت" },
  { key: "goal", label: "هدف" },
  { key: "health", label: "شرایط سلامت" },
  { key: "summary", label: "جمع‌بندی" },
] as const;

const CONDITION_KEYS: MedicalConditionKey[] = [
  "diabetes2",
  "diabetes1",
  "hypertension",
  "hypothyroid",
  "hyperthyroid",
  "fattyLiver",
  "pcos",
  "ibs",
  "kidney",
  "cardiac",
  "pregnancy",
];

const ALLERGY_KEYS: AllergyKey[] = [
  "lactose",
  "gluten",
  "nuts",
  "egg",
  "seafood",
  "soy",
  "vegetarian",
  "vegan",
];

export function OnboardingWizard() {
  const router = useRouter();
  const toast = useToast();
  const { assessment, dispatch } = useAppStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Assessment>(() => ({
    ...assessment,
    // A re-run starts from the saved answers but is not "complete" until saved.
    completedAt: null,
  }));

  const patch = (next: Partial<Assessment>) => setDraft((d) => ({ ...d, ...next }));

  const targets = useMemo(() => computeTargets(draft), [draft]);
  const band = bmiBand(targets.bmi);
  const supervised = needsClinicalReview(draft.conditions);

  const go = (delta: number) => {
    setDirection(delta);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
  };

  const finish = () => {
    dispatch({
      type: "assessment/save",
      assessment: { ...draft, completedAt: new Date().toISOString() },
    });
    toast.success("ارزیابی سلامت شما ثبت شد. برنامه بر همین اساس تنظیم می‌شود.");
    router.replace("/");
  };

  /** Multi-select that treats "هیچ‌کدام" as mutually exclusive. */
  const toggleIn = <T extends string>(list: T[], key: T, noneKey: T): T[] => {
    if (key === noneKey) return [noneKey];
    const without = list.filter((k) => k !== noneKey);
    return without.includes(key) ? without.filter((k) => k !== key) : [...without, key];
  };

  const canAdvance =
    step !== 0 || (draft.heightCm > 0 && draft.weightKg > 0 && draft.birthYear > 1300);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      {/* Header + progress */}
      <header className="shrink-0 border-b border-line bg-surface pt-[var(--safe-top)]">
        <div className="mx-auto flex max-w-[520px] items-center gap-2 px-4 py-3">
          <BrandLockup size={28} showLatin={false} />
          <div className="mr-auto text-left">
            <p className="text-2xs font-bold text-ink">
              گام {toFa(step + 1)} از {toFa(STEPS.length)}
            </p>
            <p className="text-[0.6rem] text-ink-muted">{STEPS[step].label}</p>
          </div>
        </div>
        <div className="mx-auto max-w-[520px] px-4 pb-3">
          <ProgressBar value={((step + 1) / STEPS.length) * 100} height={6} />
        </div>
      </header>

      {/* Steps */}
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col overflow-hidden">
        <div className="scroll-pane flex-1 px-4 py-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={STEPS[step].key}
              /* RTL: forward steps enter from the left. */
              initial={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              {/* ------------------------------ Step 1 ----------------------------- */}
              {step === 0 && (
                <>
                  <StepHeading
                    title="کمی درباره‌ی بدن شما"
                    hint="این اعداد پایه‌ی محاسبه‌ی کالری و درشت‌مغذی‌های شماست."
                  />

                  <Card>
                    <p className="mb-2 text-xs font-bold text-ink">جنسیت</p>
                    <SegmentedPair<Gender>
                      value={draft.gender}
                      onChange={(gender) => patch({ gender })}
                      options={[
                        { key: "female", label: "زن", icon: "👩" },
                        { key: "male", label: "مرد", icon: "👨" },
                      ]}
                    />
                  </Card>

                  <NumberField
                    label="سال تولد (شمسی)"
                    unit={`${toFa(ageFromBirthYear(draft.birthYear))} سال`}
                    value={draft.birthYear}
                    min={currentJalaliYear() - 90}
                    max={currentJalaliYear() - 10}
                    step={1}
                    grouping={false}
                    hideRange
                    onChange={(birthYear) => patch({ birthYear })}
                  />

                  <NumberField
                    label="قد"
                    unit="سانتی‌متر"
                    value={draft.heightCm}
                    min={120}
                    max={220}
                    step={1}
                    onChange={(heightCm) => patch({ heightCm })}
                  />

                  <NumberField
                    label="وزن فعلی"
                    unit="کیلوگرم"
                    value={draft.weightKg}
                    min={35}
                    max={200}
                    step={0.5}
                    decimals={1}
                    onChange={(weightKg) => patch({ weightKg })}
                  />

                  <NumberField
                    label="وزن هدف"
                    unit="کیلوگرم"
                    value={draft.targetWeightKg}
                    min={35}
                    max={200}
                    step={0.5}
                    decimals={1}
                    onChange={(targetWeightKg) => patch({ targetWeightKg })}
                  />

                  <Card className="flex items-center gap-3 border-primary-200 bg-primary-50/60">
                    <ProgressRing
                      size={64}
                      thickness={7}
                      value={Math.min(100, (targets.bmi / 40) * 100)}
                      color="#059669"
                    >
                      <span className="text-sm font-extrabold text-ink">{faNumber(targets.bmi, 1)}</span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-ink">شاخص توده بدنی (BMI)</p>
                      <p className="mt-0.5 text-2xs text-ink-muted">
                        {band.label}
                        <Sep />
                        بر پایه‌ی قد {faNumber(draft.heightCm)} و وزن {faNumber(draft.weightKg, 1)}
                      </p>
                    </div>
                  </Card>
                </>
              )}

              {/* ------------------------------ Step 2 ----------------------------- */}
              {step === 1 && (
                <>
                  <StepHeading
                    title="در طول هفته چقدر فعال هستید؟"
                    hint="فعالیت روزانه تعیین می‌کند بدن شما چه مقدار انرژی می‌سوزاند."
                  />
                  {(Object.keys(ACTIVITY_META) as ActivityLevel[]).map((key) => (
                    <ChoiceCard
                      key={key}
                      icon={ACTIVITY_META[key].icon}
                      title={ACTIVITY_META[key].label}
                      hint={ACTIVITY_META[key].hint}
                      selected={draft.activity === key}
                      onSelect={() => patch({ activity: key })}
                      trailing={
                        <span className="shrink-0 rounded-pill bg-canvas px-2 py-1 text-[0.6rem] font-bold text-ink-muted">
                          ×{faNumber(ACTIVITY_META[key].factor, 3).replace("٫۰۰۰", "")}
                        </span>
                      }
                    />
                  ))}
                </>
              )}

              {/* ------------------------------ Step 3 ----------------------------- */}
              {step === 2 && (
                <>
                  <StepHeading
                    title="هدف اصلی شما چیست؟"
                    hint="کسری یا مازاد کالری بر همین اساس تنظیم می‌شود."
                  />
                  {(Object.keys(GOAL_META) as HealthGoal[]).map((key) => (
                    <ChoiceCard
                      key={key}
                      icon={GOAL_META[key].icon}
                      title={GOAL_META[key].label}
                      hint={GOAL_META[key].hint}
                      selected={draft.goal === key}
                      onSelect={() => patch({ goal: key })}
                    />
                  ))}
                </>
              )}

              {/* ------------------------------ Step 4 ----------------------------- */}
              {step === 3 && (
                <>
                  <StepHeading
                    title="محدودیت‌های غذایی و شرایط پزشکی"
                    hint="هرچه دقیق‌تر، برنامه‌ی ایمن‌تر. می‌توانید چند مورد انتخاب کنید."
                  />

                  <Card>
                    <p className="mb-2.5 text-xs font-bold text-ink">شرایط پزشکی</p>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill
                        label={CONDITION_LABELS.none}
                        selected={draft.conditions.includes("none")}
                        onToggle={() =>
                          patch({ conditions: toggleIn(draft.conditions, "none", "none") })
                        }
                      />
                      {CONDITION_KEYS.map((key) => (
                        <TogglePill
                          key={key}
                          tone="warn"
                          label={CONDITION_LABELS[key]}
                          selected={draft.conditions.includes(key)}
                          onToggle={() => patch({ conditions: toggleIn(draft.conditions, key, "none") })}
                        />
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <p className="mb-2.5 text-xs font-bold text-ink">آلرژی و ترجیح غذایی</p>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill
                        label={ALLERGY_LABELS.none}
                        selected={draft.allergies.includes("none")}
                        onToggle={() => patch({ allergies: toggleIn(draft.allergies, "none", "none") })}
                      />
                      {ALLERGY_KEYS.map((key) => (
                        <TogglePill
                          key={key}
                          label={ALLERGY_LABELS[key]}
                          selected={draft.allergies.includes(key)}
                          onToggle={() => patch({ allergies: toggleIn(draft.allergies, key, "none") })}
                        />
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <label htmlFor="assessment-notes" className="mb-2 block text-xs font-bold text-ink">
                      توضیح بیشتر برای مشاور (اختیاری)
                    </label>
                    <textarea
                      id="assessment-notes"
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => patch({ notes: e.target.value })}
                      placeholder="مثلاً: شب‌کار هستم، صبحانه نمی‌خورم…"
                      className="w-full resize-none rounded-card border border-line bg-canvas p-3 text-xs leading-6 text-ink outline-none placeholder:text-ink-soft focus:border-primary-500"
                    />
                  </Card>

                  {supervised && (
                    <div className="rounded-card border border-warn-100 bg-warn-50 p-3.5">
                      <p className="flex items-center gap-1.5 text-2xs font-extrabold text-warn-600">
                        <ShieldIcon width={13} height={13} />
                        نیازمند نظارت پزشک
                      </p>
                      <p className="mt-1 text-2xs leading-5 text-warn-600">
                        با توجه به شرایطی که انتخاب کردید، برنامه‌ی شما پیش از اجرا توسط متخصص
                        بازبینی می‌شود و اعداد زیر فقط تخمین اولیه است.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ------------------------------ Step 5 ----------------------------- */}
              {step === 4 && (
                <>
                  <StepHeading
                    title="برنامه‌ی پایه‌ی شما آماده است"
                    hint="این اعداد از مشخصات شما محاسبه شده و مشاور می‌تواند آن را تنظیم کند."
                  />

                  <Card className="flex items-center gap-4">
                    <ProgressRing
                      size={120}
                      thickness={10}
                      segments={[
                        { value: Math.min(100, (targets.dailyCalories / 3000) * 100), color: "#059669" },
                        { value: Math.min(100, (targets.bmi / 40) * 100), color: "#0284C7" },
                      ]}
                    >
                      <div>
                        <p className="text-lg font-extrabold leading-none text-ink">
                          {faNumber(targets.dailyCalories)}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] text-ink-muted">کیلوکالری</p>
                      </div>
                    </ProgressRing>
                    <ul className="flex flex-1 flex-col gap-2 text-2xs">
                      <SummaryRow label="سوخت‌وساز پایه (BMR)" value={`${faNumber(targets.bmr)} کالری`} />
                      <SummaryRow label="مصرف روزانه (TDEE)" value={`${faNumber(targets.tdee)} کالری`} />
                      <SummaryRow label="شاخص توده بدنی" value={`${faNumber(targets.bmi, 1)} — ${band.label}`} />
                      <SummaryRow label="آب روزانه" value={`${faNumber(targets.waterTargetMl)} میلی‌لیتر`} />
                    </ul>
                  </Card>

                  <Card>
                    <p className="mb-3 text-xs font-extrabold text-ink">درشت‌مغذی‌های روزانه</p>
                    <div className="grid grid-cols-3 gap-2">
                      <MacroBox label="پروتئین" grams={targets.macros.protein} tone="primary" />
                      <MacroBox label="کربوهیدرات" grams={targets.macros.carbs} tone="sky" />
                      <MacroBox label="چربی" grams={targets.macros.fat} tone="warn" />
                    </div>
                    <p className="mt-3 rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
                      پروتئین بر پایه‌ی {faNumber(targets.proteinPerKg, 1)} گرم به ازای هر کیلوگرم وزن بدن
                      محاسبه شده است.
                    </p>
                  </Card>

                  <Card>
                    <p className="mb-2 text-xs font-extrabold text-ink">پیش‌بینی روند</p>
                    <p className="text-2xs leading-6 text-ink-muted">
                      با این برنامه انتظار می‌رود هفته‌ای حدود{" "}
                      <span className="font-extrabold text-ink">
                        {faNumber(Math.abs(targets.weeklyDeltaKg), 2)} کیلوگرم
                      </span>{" "}
                      {targets.weeklyDeltaKg < 0 ? "کاهش وزن" : targets.weeklyDeltaKg > 0 ? "افزایش وزن" : "ثبات وزن"}{" "}
                      داشته باشید
                      <Sep />
                      هدف شما {faNumber(draft.targetWeightKg, 1)} کیلوگرم است.
                    </p>
                  </Card>

                  <div className="rounded-card border border-line bg-surface p-3.5">
                    <p className="text-2xs font-bold text-ink">خلاصه‌ی پاسخ‌های شما</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Tag>{ACTIVITY_META[draft.activity].label}</Tag>
                      <Tag>{GOAL_META[draft.goal].label}</Tag>
                      {draft.conditions
                        .filter((c) => c !== "none")
                        .map((c) => (
                          <Tag key={c} tone="warn">
                            {CONDITION_LABELS[c]}
                          </Tag>
                        ))}
                      {draft.allergies
                        .filter((a) => a !== "none")
                        .map((a) => (
                          <Tag key={a}>{ALLERGY_LABELS[a]}</Tag>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="shrink-0 border-t border-line bg-surface px-4 pb-[calc(0.85rem+var(--safe-bottom))] pt-3">
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => go(-1)} className="app-btn-ghost shrink-0 px-4">
                <ChevronRight width={16} height={16} />
                قبلی
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!canAdvance}
                className={cx("app-btn-primary flex-1", !canAdvance && "opacity-40 shadow-none")}
              >
                ادامه
                <ChevronLeft width={16} height={16} />
              </button>
            ) : (
              <button type="button" onClick={finish} className="app-btn-primary flex-1">
                ثبت و شروع برنامه
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------- bits ---------------------------------- */

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="pb-1">
      <h1 className="text-base font-extrabold leading-7 text-ink">{title}</h1>
      <p className="mt-1 text-2xs leading-5 text-ink-muted">{hint}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5 last:border-0 last:pb-0">
      <span className="text-ink-muted">{label}</span>
      <span className="shrink-0 font-extrabold text-ink">{value}</span>
    </li>
  );
}

function MacroBox({
  label,
  grams,
  tone,
}: {
  label: string;
  grams: number;
  tone: "primary" | "sky" | "warn";
}) {
  const color = {
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
  }[tone];
  return (
    <div className="rounded-card border border-line p-2.5 text-center">
      <p className={cx("text-base font-extrabold", color)}>{faNumber(grams)}</p>
      <p className="text-[0.6rem] text-ink-soft">گرم</p>
      <p className="mt-0.5 text-2xs text-ink-muted">{label}</p>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cx(
        "rounded-pill px-2 py-1 text-[0.6rem] font-bold",
        tone === "warn" ? "bg-warn-50 text-warn-600" : "bg-primary-50 text-primary-700",
      )}
    >
      {children}
    </span>
  );
}
