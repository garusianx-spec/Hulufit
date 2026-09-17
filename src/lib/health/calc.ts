import type {
  ActivityLevel,
  Assessment,
  Gender,
  HealthGoal,
  HealthTargets,
  Macros,
} from "@/types";

/**
 * Baseline energy and macro maths for the onboarding assessment.
 * Mifflin-St Jeor for BMR, standard activity multipliers for TDEE, then a
 * goal-dependent adjustment capped so the plan never drops below a safe floor.
 */

export const ACTIVITY_META: Record<
  ActivityLevel,
  { label: string; hint: string; factor: number; icon: string }
> = {
  sedentary: {
    label: "کم‌تحرک",
    hint: "کار پشت میز، بدون ورزش منظم",
    factor: 1.2,
    icon: "🪑",
  },
  light: {
    label: "کمی فعال",
    hint: "۱ تا ۳ جلسه ورزش سبک در هفته",
    factor: 1.375,
    icon: "🚶",
  },
  moderate: {
    label: "نسبتاً فعال",
    hint: "۳ تا ۵ جلسه تمرین در هفته",
    factor: 1.55,
    icon: "🏃",
  },
  very: {
    label: "خیلی فعال",
    hint: "۶ جلسه یا بیشتر، یا شغل پرتحرک",
    factor: 1.725,
    icon: "🏋️",
  },
};

export const GOAL_META: Record<
  HealthGoal,
  { label: string; hint: string; icon: string; adjust: number; proteinPerKg: number }
> = {
  loss: {
    label: "کاهش وزن",
    hint: "کسری کالری کنترل‌شده با حفظ توده عضلانی",
    icon: "📉",
    adjust: -0.2,
    proteinPerKg: 1.8,
  },
  hypertrophy: {
    label: "عضله‌سازی",
    hint: "مازاد کالری ملایم برای رشد عضله",
    icon: "💪",
    adjust: 0.12,
    proteinPerKg: 2.0,
  },
  maintenance: {
    label: "تثبیت وزن",
    hint: "حفظ وزن فعلی و بهبود ترکیب بدن",
    icon: "⚖️",
    adjust: 0,
    proteinPerKg: 1.6,
  },
  clinical: {
    label: "درمانی / توان‌بخشی",
    hint: "تحت نظر پزشک، با هدف کنترل شرایط بالینی",
    icon: "🩺",
    adjust: -0.1,
    proteinPerKg: 1.4,
  },
};

/** Absolute floors — a plan is never allowed to prescribe below these. */
const CALORIE_FLOOR: Record<Gender, number> = { female: 1200, male: 1500 };

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return weightKg / (m * m);
}

export function bmiBand(value: number): {
  label: string;
  tone: "sky" | "primary" | "warn" | "danger";
} {
  if (value < 18.5) return { label: "کمبود وزن", tone: "sky" };
  if (value < 25) return { label: "وزن نرمال", tone: "primary" };
  if (value < 30) return { label: "اضافه‌وزن", tone: "warn" };
  return { label: "چاقی", tone: "danger" };
}

/** Mifflin-St Jeor. */
export function bmr(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

const jalaliYearFormat = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { year: "numeric" });

/**
 * The current Jalali year.
 *
 * `format()` returns "1405 AP" — the era suffix makes Number() NaN — so the
 * year part is read from formatToParts instead.
 */
export function currentJalaliYear(now = new Date()): number {
  const part = jalaliYearFormat.formatToParts(now).find((p) => p.type === "year");
  return Number(part?.value ?? 0);
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  // The form asks for a Jalali birth year because that is the calendar the
  // user thinks in; the age it yields is what the BMR formula needs.
  return Math.max(10, Math.min(100, currentJalaliYear(now) - birthYear));
}

/** Everything the summary screen and the client dashboard need. */
export function computeTargets(assessment: Assessment, now = new Date()): HealthTargets {
  const age = ageFromBirthYear(assessment.birthYear, now);
  const basal = bmr(assessment.weightKg, assessment.heightCm, age, assessment.gender);
  const tdee = basal * ACTIVITY_META[assessment.activity].factor;

  const goal = GOAL_META[assessment.goal];
  const floor = CALORIE_FLOOR[assessment.gender];
  const dailyCalories = Math.max(floor, Math.round((tdee * (1 + goal.adjust)) / 10) * 10);

  // Protein is anchored per kilo, fat to 25% of intake, carbs take the rest.
  const protein = Math.round(assessment.weightKg * goal.proteinPerKg);
  const fat = Math.round((dailyCalories * 0.25) / 9);
  const carbs = Math.max(40, Math.round((dailyCalories - protein * 4 - fat * 9) / 4));

  const macros: Macros = { protein, carbs, fat };

  // 35 ml/kg, nudged up for the more active levels.
  const waterTargetMl =
    Math.round(
      (assessment.weightKg * 35 + (assessment.activity === "very" ? 500 : assessment.activity === "moderate" ? 300 : 0)) /
        100,
    ) * 100;

  // A 7700 kcal ≈ 1 kg approximation, reported per week.
  const weeklyDeltaKg = Number((((dailyCalories - tdee) * 7) / 7700).toFixed(2));

  return {
    age,
    bmi: bmi(assessment.weightKg, assessment.heightCm),
    bmr: Math.round(basal),
    tdee: Math.round(tdee),
    dailyCalories,
    macros,
    waterTargetMl,
    proteinPerKg: goal.proteinPerKg,
    weeklyDeltaKg,
  };
}

/** Percent split of the calorie budget, for the specialist's macro sliders. */
export function macrosToSplit(macros: Macros, calories: number) {
  if (calories <= 0) return { carbs: 0, protein: 0, fat: 0 };
  return {
    carbs: Math.round(((macros.carbs * 4) / calories) * 100),
    protein: Math.round(((macros.protein * 4) / calories) * 100),
    fat: Math.round(((macros.fat * 9) / calories) * 100),
  };
}

export function splitToMacros(
  split: { carbs: number; protein: number; fat: number },
  calories: number,
): Macros {
  return {
    carbs: Math.round((calories * (split.carbs / 100)) / 4),
    protein: Math.round((calories * (split.protein / 100)) / 4),
    fat: Math.round((calories * (split.fat / 100)) / 9),
  };
}

export const CONDITION_LABELS: Record<string, string> = {
  none: "هیچ‌کدام",
  diabetes1: "دیابت نوع ۱",
  diabetes2: "دیابت نوع ۲",
  hypertension: "فشار خون بالا",
  hypothyroid: "کم‌کاری تیروئید",
  hyperthyroid: "پرکاری تیروئید",
  fattyLiver: "کبد چرب",
  pcos: "تخمدان پلی‌کیستیک",
  ibs: "سندرم روده تحریک‌پذیر",
  kidney: "بیماری کلیوی",
  cardiac: "بیماری قلبی",
  pregnancy: "بارداری / شیردهی",
};

export const ALLERGY_LABELS: Record<string, string> = {
  none: "هیچ‌کدام",
  lactose: "عدم تحمل لاکتوز",
  gluten: "حساسیت به گلوتن",
  nuts: "آلرژی به آجیل",
  egg: "آلرژی به تخم‌مرغ",
  seafood: "آلرژی به غذای دریایی",
  soy: "آلرژی به سویا",
  vegetarian: "گیاه‌خوار",
  vegan: "وگان",
};

/**
 * Conditions that should route the plan through a clinician rather than the
 * generic calculator. Surfaced as a warning on the summary step.
 */
const SUPERVISED = new Set(["diabetes1", "kidney", "cardiac", "pregnancy"]);

export function needsClinicalReview(conditions: string[]): boolean {
  return conditions.some((c) => SUPERVISED.has(c));
}
