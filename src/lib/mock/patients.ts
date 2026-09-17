import type { Patient } from "@/types";

function daysAgo(n: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** The roster the signed-in specialist sees in Doctor View. */
export const patients: Patient[] = [
  {
    id: "pt_1",
    threadId: "th_1",
    firstName: "سارا",
    lastName: "رضایی",
    avatarUrl: null,
    gender: "female",
    age: 32,
    heightCm: 166,
    currentWeightKg: 71.2,
    startWeightKg: 78.4,
    targetWeightKg: 64,
    goal: "loss",
    activity: "moderate",
    conditions: ["hypothyroid"],
    allergies: ["lactose"],
    adherencePct: 86,
    lastCheckIn: daysAgo(0, 7),
    unreadMessages: 2,
    planStatus: "active",
    joinedAt: daysAgo(48),
  },
  {
    id: "pt_2",
    threadId: "th_2",
    firstName: "محمد",
    lastName: "کاظمی",
    avatarUrl: null,
    gender: "male",
    age: 41,
    heightCm: 178,
    currentWeightKg: 96.4,
    startWeightKg: 104.2,
    targetWeightKg: 84,
    goal: "clinical",
    activity: "light",
    conditions: ["diabetes2", "hypertension", "fattyLiver"],
    allergies: ["none"],
    adherencePct: 54,
    lastCheckIn: daysAgo(3),
    unreadMessages: 0,
    planStatus: "needsReview",
    joinedAt: daysAgo(96),
  },
  {
    id: "pt_3",
    threadId: "th_3",
    firstName: "نگین",
    lastName: "شریفی",
    avatarUrl: null,
    gender: "female",
    age: 26,
    heightCm: 161,
    currentWeightKg: 52.8,
    startWeightKg: 49.5,
    targetWeightKg: 56,
    goal: "hypertrophy",
    activity: "very",
    conditions: ["none"],
    allergies: ["vegetarian"],
    adherencePct: 94,
    lastCheckIn: daysAgo(0, 6),
    unreadMessages: 1,
    planStatus: "active",
    joinedAt: daysAgo(31),
  },
  {
    id: "pt_4",
    threadId: "th_4",
    firstName: "علی",
    lastName: "مرادی",
    avatarUrl: null,
    gender: "male",
    age: 35,
    heightCm: 182,
    currentWeightKg: 88.1,
    startWeightKg: 88.9,
    targetWeightKg: 82,
    goal: "maintenance",
    activity: "moderate",
    conditions: ["none"],
    allergies: ["gluten"],
    adherencePct: 71,
    lastCheckIn: daysAgo(1),
    unreadMessages: 0,
    planStatus: "active",
    joinedAt: daysAgo(64),
  },
  {
    id: "pt_5",
    firstName: "زهرا",
    lastName: "احمدی",
    threadId: "th_5",
    avatarUrl: null,
    gender: "female",
    age: 29,
    heightCm: 170,
    currentWeightKg: 83.6,
    startWeightKg: 90.2,
    targetWeightKg: 70,
    goal: "loss",
    activity: "sedentary",
    conditions: ["pcos"],
    allergies: ["nuts"],
    adherencePct: 38,
    lastCheckIn: daysAgo(9),
    unreadMessages: 4,
    planStatus: "needsReview",
    joinedAt: daysAgo(120),
  },
  {
    id: "pt_6",
    threadId: "th_6",
    firstName: "رضا",
    lastName: "طاهری",
    avatarUrl: null,
    gender: "male",
    age: 47,
    heightCm: 175,
    currentWeightKg: 79.3,
    startWeightKg: 92.0,
    targetWeightKg: 78,
    goal: "maintenance",
    activity: "light",
    conditions: ["hypertension"],
    allergies: ["none"],
    adherencePct: 88,
    lastCheckIn: daysAgo(2),
    unreadMessages: 0,
    planStatus: "expired",
    joinedAt: daysAgo(210),
  },
];

export function findPatient(id: string) {
  return patients.find((p) => p.id === id);
}

/** Adherence banding drives the roster badges. */
export function adherenceBand(pct: number): {
  label: string;
  tone: "primary" | "warn" | "danger";
} {
  if (pct >= 80) return { label: "پایبندی عالی", tone: "primary" };
  if (pct >= 60) return { label: "پایبندی متوسط", tone: "warn" };
  return { label: "پایبندی ضعیف", tone: "danger" };
}

export const PLAN_STATUS_META: Record<
  Patient["planStatus"],
  { label: string; tone: "primary" | "warn" | "danger" }
> = {
  active: { label: "برنامه فعال", tone: "primary" },
  needsReview: { label: "نیازمند بازبینی", tone: "warn" },
  expired: { label: "برنامه منقضی", tone: "danger" },
};

/** The specialist whose portal this is. */
export const currentSpecialist = {
  id: "sp_1",
  name: "دکتر نگار کیانی",
  title: "متخصص تغذیه بالینی",
};
