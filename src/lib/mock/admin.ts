/**
 * Operations-console data.
 *
 * Mirrors the shape of `GET /api/v1/admin/*` on the gateway
 * (`server/src/db/adminFixtures.ts`), so the console swaps to live data by
 * replacing this module with fetches — no component changes.
 */

export type VerificationState = "verified" | "pending" | "rejected";
export type UserState = "active" | "at_risk" | "expired";
export type ContentState = "published" | "draft" | "review";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export interface TrendPoint {
  week: string;
  activeUsers: number;
  consultations: number;
  revenueToman: number;
}

export const adminTrend: TrendPoint[] = Array.from({ length: 12 }, (_, i) => ({
  week: `هفته ${i + 1}`,
  activeUsers: 1180 + i * 145 + ((i * 37) % 120),
  consultations: 220 + i * 26 + ((i * 13) % 40),
  revenueToman: 48_000_000 + i * 6_400_000 + ((i * 911_000) % 3_000_000),
}));

export const adminOverview = {
  users: { total: 18_432, active: 7_918, newThisWeek: 612, churnedThisWeek: 148 },
  consultations: { total: 41_270, thisWeek: 1_486, openThreads: 812, avgResponseMinutes: 34 },
  revenue: {
    grossToman: 1_284_500_000,
    thisMonthToman: 214_900_000,
    refundsToman: 11_200_000,
    commissionToman: 256_900_000,
  },
  retention: { d30: 0.62, d60: 0.48, d90: 0.41 },
};

export const retentionCohorts = [
  { cohort: "خرداد ۱۴۰۵", size: 1420, m1: 0.71, m2: 0.55, m3: 0.44 },
  { cohort: "تیر ۱۴۰۵", size: 1610, m1: 0.68, m2: 0.52, m3: 0.42 },
  { cohort: "مرداد ۱۴۰۵", size: 1735, m1: 0.73, m2: 0.58, m3: 0.46 },
  { cohort: "شهریور ۱۴۰۵", size: 1880, m1: 0.7, m2: 0.54, m3: 0 },
];

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  joinedAt: string;
  status: UserState;
  plan: string;
  specialist: string;
  adherencePct: number;
  lastSeen: string;
  assessment: {
    age: number;
    heightCm: number;
    weightKg: number;
    goal: string;
    activity: string;
    conditions: string[];
    allergies: string[];
  };
}

export const adminUsers: AdminUser[] = [
  {
    id: "u_1", name: "سارا رضایی", phone: "۰۹۱۲۳۴۵۶۷۸۹", joinedAt: daysAgo(48), status: "active",
    plan: "سه‌ماهه تغذیه و تمرین", specialist: "دکتر نگار کیانی", adherencePct: 86, lastSeen: daysAgo(0),
    assessment: { age: 32, heightCm: 166, weightKg: 71.2, goal: "کاهش وزن", activity: "نسبتاً فعال", conditions: ["کم‌کاری تیروئید"], allergies: ["عدم تحمل لاکتوز"] },
  },
  {
    id: "u_2", name: "محمد کاظمی", phone: "۰۹۳۵۱۱۲۲۳۳۴", joinedAt: daysAgo(96), status: "active",
    plan: "درمانی — کبد چرب", specialist: "دکتر نگار کیانی", adherencePct: 54, lastSeen: daysAgo(3),
    assessment: { age: 41, heightCm: 178, weightKg: 96.4, goal: "درمانی", activity: "کمی فعال", conditions: ["دیابت نوع ۲", "فشار خون بالا", "کبد چرب"], allergies: [] },
  },
  {
    id: "u_3", name: "نگین شریفی", phone: "۰۹۰۲۷۷۸۸۹۹۰", joinedAt: daysAgo(31), status: "active",
    plan: "عضله‌سازی", specialist: "مربی امیر صادقی", adherencePct: 94, lastSeen: daysAgo(0),
    assessment: { age: 26, heightCm: 161, weightKg: 52.8, goal: "عضله‌سازی", activity: "خیلی فعال", conditions: [], allergies: ["گیاه‌خوار"] },
  },
  {
    id: "u_4", name: "علی مرادی", phone: "۰۹۱۹۴۴۵۵۶۶۷", joinedAt: daysAgo(64), status: "active",
    plan: "تثبیت وزن", specialist: "مربی الهام نوری", adherencePct: 71, lastSeen: daysAgo(1),
    assessment: { age: 35, heightCm: 182, weightKg: 88.1, goal: "تثبیت وزن", activity: "نسبتاً فعال", conditions: [], allergies: ["حساسیت به گلوتن"] },
  },
  {
    id: "u_5", name: "زهرا احمدی", phone: "۰۹۳۷۶۶۵۵۴۴۳", joinedAt: daysAgo(120), status: "at_risk",
    plan: "کاهش وزن — PCOS", specialist: "دکتر مریم اسدی", adherencePct: 38, lastSeen: daysAgo(9),
    assessment: { age: 29, heightCm: 170, weightKg: 83.6, goal: "کاهش وزن", activity: "کم‌تحرک", conditions: ["تخمدان پلی‌کیستیک"], allergies: ["آلرژی به آجیل"] },
  },
  {
    id: "u_6", name: "رضا طاهری", phone: "۰۹۱۲۰۰۱۱۲۲۳", joinedAt: daysAgo(210), status: "expired",
    plan: "—", specialist: "—", adherencePct: 88, lastSeen: daysAgo(2),
    assessment: { age: 47, heightCm: 175, weightKg: 79.3, goal: "تثبیت وزن", activity: "کمی فعال", conditions: ["فشار خون بالا"], allergies: [] },
  },
];

export interface PaymentLog {
  id: string;
  userId: string;
  title: string;
  amountToman: number;
  status: "paid" | "refunded" | "pending";
  at: string;
  refId: string;
  gateway: string;
}

export const adminPayments: PaymentLog[] = [
  { id: "pay_31", userId: "u_1", title: "تمدید پکیج سه‌ماهه", amountToman: 4_850_000, status: "paid", at: daysAgo(48), refId: "۸۹۲۳۴۱۷۷", gateway: "زرین‌پال" },
  { id: "pay_22", userId: "u_1", title: "مشاوره روان‌شناسی تغذیه", amountToman: 890_000, status: "paid", at: daysAgo(96), refId: "۷۷۱۲۳۴۰۹", gateway: "زرین‌پال" },
  { id: "pay_11", userId: "u_1", title: "پکیج یک‌ماهه آنالیز بدن", amountToman: 1_290_000, status: "refunded", at: daysAgo(140), refId: "۶۵۴۸۸۱۰۲", gateway: "زرین‌پال" },
  { id: "pay_40", userId: "u_2", title: "پکیج درمانی شش‌ماهه", amountToman: 7_400_000, status: "paid", at: daysAgo(96), refId: "۹۰۱۲۳۴۵۶", gateway: "سامان" },
  { id: "pay_55", userId: "u_5", title: "پکیج سه‌ماهه", amountToman: 3_900_000, status: "pending", at: daysAgo(4), refId: "۱۱۲۲۳۳۴۴", gateway: "زرین‌پال" },
  { id: "pay_61", userId: "u_3", title: "پکیج عضله‌سازی دوماهه", amountToman: 1_800_000, status: "paid", at: daysAgo(31), refId: "۵۵۶۶۷۷۸۸", gateway: "زرین‌پال" },
];

export interface AdminSpecialist {
  id: string;
  name: string;
  title: string;
  verification: VerificationState;
  licenceNo: string;
  clients: number;
  capacity: number;
  rating: number;
  feeToman: number;
  commissionPct: number;
  payoutToman: number;
  responseMinutes: number;
  joinedAt: string;
}

export const adminSpecialists: AdminSpecialist[] = [
  { id: "sp_1", name: "دکتر نگار کیانی", title: "متخصص تغذیه بالینی", verification: "verified", licenceNo: "ن-۱۲۴۵۷", clients: 312, capacity: 350, rating: 4.9, feeToman: 1_450_000, commissionPct: 18, payoutToman: 184_500_000, responseMinutes: 18, joinedAt: daysAgo(640) },
  { id: "sp_2", name: "مربی امیر صادقی", title: "کارشناس ارشد فیزیولوژی ورزشی", verification: "verified", licenceNo: "ت-۸۸۳۲۱", clients: 268, capacity: 300, rating: 4.8, feeToman: 1_150_000, commissionPct: 20, payoutToman: 142_300_000, responseMinutes: 26, joinedAt: daysAgo(520) },
  { id: "sp_3", name: "دکتر مریم اسدی", title: "متخصص تغذیه مادر و کودک", verification: "verified", licenceNo: "ن-۹۹۱۰۲", clients: 201, capacity: 220, rating: 4.9, feeToman: 1_300_000, commissionPct: 18, payoutToman: 121_900_000, responseMinutes: 31, joinedAt: daysAgo(410) },
  { id: "sp_4", name: "دکتر سهیل مرادی", title: "روان‌شناس بالینی — اختلالات خوردن", verification: "pending", licenceNo: "ر-۴۵۶۷۸", clients: 143, capacity: 180, rating: 4.7, feeToman: 890_000, commissionPct: 22, payoutToman: 88_400_000, responseMinutes: 47, joinedAt: daysAgo(150) },
  { id: "sp_5", name: "مربی الهام نوری", title: "مربی فیتنس بانوان", verification: "verified", licenceNo: "ت-۳۳۴۴۵", clients: 176, capacity: 200, rating: 4.8, feeToman: 950_000, commissionPct: 20, payoutToman: 79_100_000, responseMinutes: 22, joinedAt: daysAgo(300) },
  { id: "sp_6", name: "دکتر پویا رحیمی", title: "متخصص تغذیه ورزشی", verification: "rejected", licenceNo: "—", clients: 0, capacity: 120, rating: 0, feeToman: 1_100_000, commissionPct: 20, payoutToman: 0, responseMinutes: 0, joinedAt: daysAgo(22) },
];

export interface ContentItem {
  id: string;
  kind: "article" | "recipe";
  title: string;
  category: string;
  status: ContentState;
  author: string;
  views: number;
  publishedAt: string;
}

export const adminContent: ContentItem[] = [
  { id: "ar_1", kind: "article", title: "چقدر پروتئین برای حفظ عضله لازم است؟", category: "تغذیه بالینی", status: "published", author: "دکتر نگار کیانی", views: 18_420, publishedAt: daysAgo(3) },
  { id: "ar_2", kind: "article", title: "حجم تمرین بهینه برای رشد عضله", category: "هایپرتروفی و تمرین", status: "published", author: "مربی امیر صادقی", views: 12_110, publishedAt: daysAgo(6) },
  { id: "ar_3", kind: "article", title: "کراتین مونوهیدرات: پرشواهدترین مکمل", category: "مکمل‌ها", status: "published", author: "دکتر پویا رحیمی", views: 9_845, publishedAt: daysAgo(11) },
  { id: "rc_1", kind: "recipe", title: "خوراک مرغ و کینوا — ۴۲۰ کالری", category: "غذای اصلی", status: "published", author: "تیم تغذیه هلوفیت", views: 6_310, publishedAt: daysAgo(8) },
  { id: "rc_2", kind: "recipe", title: "اسموتی پروتئینی بعد از تمرین", category: "میان‌وعده", status: "draft", author: "تیم تغذیه هلوفیت", views: 0, publishedAt: daysAgo(1) },
  { id: "ar_4", kind: "article", title: "چرخه خوردن هیجانی و شکستن آن", category: "روان‌شناسی رفتار", status: "review", author: "دکتر سهیل مرادی", views: 0, publishedAt: daysAgo(2) },
];

export const findAdminUser = (id: string) => adminUsers.find((u) => u.id === id);
export const paymentsFor = (userId: string) => adminPayments.filter((p) => p.userId === userId);
