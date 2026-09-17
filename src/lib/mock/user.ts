import type { DailyLog, MeasurementEntry, Order, Subscription, UserProfile, WeightEntry } from "@/types";

/** Pre-set, fully populated user state — the app lands straight into this. */
export const currentUser: UserProfile = {
  id: "u_1",
  firstName: "سارا",
  lastName: "رضایی",
  avatarUrl: null,
  gender: "female",
  birthYear: 1994,
  heightCm: 166,
  startWeightKg: 78.4,
  currentWeightKg: 71.2,
  targetWeightKg: 64,
  dailyCalorieTarget: 1650,
  dailyWaterTargetMl: 2400,
  macroTarget: { protein: 118, carbs: 165, fat: 52 },
  joinedAt: "2026-04-11T08:00:00.000Z",
  coachId: "sp_1",
};

export const todayLog: DailyLog = {
  date: new Date().toISOString(),
  caloriesConsumed: 1180,
  caloriesBurned: 430,
  waterMl: 1500,
  steps: 7420,
  compliancePct: 78,
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7, 30, 0, 0);
  return d.toISOString();
}

export const weightHistory: WeightEntry[] = [
  { date: daysAgo(84), weightKg: 78.4 },
  { date: daysAgo(77), weightKg: 77.6 },
  { date: daysAgo(70), weightKg: 76.9 },
  { date: daysAgo(63), weightKg: 76.1 },
  { date: daysAgo(56), weightKg: 75.8 },
  { date: daysAgo(49), weightKg: 74.9 },
  { date: daysAgo(42), weightKg: 74.2 },
  { date: daysAgo(35), weightKg: 73.8 },
  { date: daysAgo(28), weightKg: 73.1 },
  { date: daysAgo(21), weightKg: 72.6 },
  { date: daysAgo(14), weightKg: 72.0 },
  { date: daysAgo(7), weightKg: 71.6 },
  { date: daysAgo(0), weightKg: 71.2 },
];

export const measurements: MeasurementEntry[] = [
  { date: daysAgo(56), waistCm: 92, hipCm: 108, chestCm: 98, armCm: 31, thighCm: 62 },
  { date: daysAgo(28), waistCm: 88, hipCm: 105, chestCm: 96, armCm: 30, thighCm: 60 },
  { date: daysAgo(0), waistCm: 84.5, hipCm: 102, chestCm: 94, armCm: 29.5, thighCm: 58.5 },
];

export const waterLogSteps = [200, 250, 330, 500];

export const subscription: Subscription = {
  id: "sub_1",
  planTitle: "پکیج سه‌ماهه تغذیه و تمرین",
  specialistName: "دکتر نگار کیانی",
  startedAt: daysAgo(48),
  expiresAt: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 42);
    return d.toISOString();
  })(),
  daysLeft: 42,
  totalDays: 90,
  status: "active",
};

export const orders: Order[] = [
  {
    id: "ord_3",
    title: "تمدید پکیج سه‌ماهه تغذیه و تمرین",
    date: daysAgo(48),
    amountToman: 4_850_000,
    status: "paid",
    refId: "۸۹۲۳۴۱۷۷",
  },
  {
    id: "ord_2",
    title: "جلسه مشاوره روان‌شناسی تغذیه",
    date: daysAgo(96),
    amountToman: 890_000,
    status: "paid",
    refId: "۷۷۱۲۳۴۰۹",
  },
  {
    id: "ord_1",
    title: "پکیج یک‌ماهه آنالیز بدن",
    date: daysAgo(140),
    amountToman: 1_290_000,
    status: "refunded",
    refId: "۶۵۴۸۸۱۰۲",
  },
];

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiBand(value: number): { label: string; tone: "sky" | "primary" | "warn" | "danger" } {
  if (value < 18.5) return { label: "کمبود وزن", tone: "sky" };
  if (value < 25) return { label: "وزن نرمال", tone: "primary" };
  if (value < 30) return { label: "اضافه‌وزن", tone: "warn" };
  return { label: "چاقی", tone: "danger" };
}
