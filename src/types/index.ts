/** Shared domain types for HelloFit / هلوفیت. */

export type ID = string;

/* ----------------------------- User & tracker ---------------------------- */

export type Gender = "male" | "female";

export interface UserProfile {
  id: ID;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  gender: Gender;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  dailyCalorieTarget: number;
  dailyWaterTargetMl: number;
  macroTarget: Macros;
  joinedAt: string;
  coachId: ID;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightEntry {
  date: string; // ISO
  weightKg: number;
}

export interface MeasurementEntry {
  date: string;
  waistCm: number;
  hipCm: number;
  chestCm: number;
  armCm: number;
  thighCm: number;
}

export interface DailyLog {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  waterMl: number;
  steps: number;
  compliancePct: number;
}

/* --------------------------------- Diet --------------------------------- */

export type MealSlot = "breakfast" | "morningSnack" | "lunch" | "afternoonSnack" | "dinner";

export interface FoodItem {
  id: ID;
  name: string;
  amount: string;
  calories: number;
  macros: Macros;
  swappable: boolean;
}

export interface FoodAlternative extends FoodItem {
  reason: string;
}

export interface Meal {
  id: ID;
  slot: MealSlot;
  title: string;
  timeHint: string;
  items: FoodItem[];
  note?: string;
}

export interface DietPlan {
  id: ID;
  title: string;
  issuedBy: string;
  validUntil: string;
  dailyCalories: number;
  macroTarget: Macros;
  meals: Meal[];
}

/* -------------------------------- Workout -------------------------------- */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "legs"
  | "arms"
  | "core"
  | "glutes"
  | "cardio"
  | "fullBody";

export interface ExerciseSet {
  reps: number;
  weightKg?: number;
  done: boolean;
}

export interface Exercise {
  id: ID;
  name: string;
  latinName: string;
  targets: MuscleGroup[];
  sets: ExerciseSet[];
  restSeconds: number;
  tempo?: string;
  previewUrl: string; // animated GIF / looping mp4 poster
  videoUrl?: string;
  coachNote?: string;
}

export interface WorkoutDay {
  id: ID;
  dayIndex: number; // 0 = Saturday (Persian week)
  title: string;
  focus: MuscleGroup[];
  durationMin: number;
  estimatedBurn: number;
  isRestDay: boolean;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: ID;
  title: string;
  issuedBy: string;
  weekOf: string;
  days: WorkoutDay[];
}

/* ------------------------- Supplements & medicine ------------------------ */

export type ReminderWindow = "morning" | "preWorkout" | "postWorkout" | "afternoon" | "bedtime";

export interface SupplementItem {
  id: ID;
  name: string;
  latinName?: string;
  kind: "supplement" | "medicine";
  dosage: string;
  window: ReminderWindow;
  timeLabel: string;
  withFood: boolean;
  note?: string;
  reminderOn: boolean;
  takenAt: string | null; // auto-timestamp on check
}

/* ------------------------------ Specialists ------------------------------ */

export type SpecialistKind = "dietitian" | "trainer" | "psychologist";

export interface Package {
  id: ID;
  title: string;
  durationLabel: string;
  priceToman: number;
  originalPriceToman?: number;
  features: string[];
  popular?: boolean;
}

export interface Specialist {
  id: ID;
  name: string;
  kind: SpecialistKind;
  title: string;
  credentials: string[];
  specialties: string[];
  avatarUrl: string | null;
  rating: number;
  reviewsCount: number;
  clientsCount: number;
  yearsExperience: number;
  startingPriceToman: number;
  online: boolean;
  bio: string;
  packages: Package[];
  nextSlot: string;
}

/* -------------------------------- Articles ------------------------------- */

export type ArticleCategory = "nutrition" | "training" | "supplement" | "behavior";

export interface Article {
  id: ID;
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  coverColor: string;
  readingMinutes: number;
  publishedAt: string;
  author: {
    name: string;
    credential: string;
    avatarUrl: string | null;
  };
  evidenceLevel: "A" | "B" | "C";
  references: string[];
  body: ArticleBlock[];
  tags: string[];
}

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "callout"; tone: "info" | "warn"; title: string; text: string };

/* ---------------------------------- Chat --------------------------------- */

export type MessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";
export type MessageAuthor = "me" | "coach";

export type AttachmentKind = "image" | "pdf" | "audio" | "lab" | "other";

export interface Attachment {
  id: ID;
  kind: AttachmentKind;
  name: string;
  sizeBytes: number;
  mime: string;
  url: string; // object URL in mock mode
  durationSec?: number; // voice notes
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: ID;
  clientId?: string;
  author: MessageAuthor;
  text?: string;
  attachment?: Attachment;
  createdAt: string;
  status: MessageStatus;
  replyTo?: { id: ID; preview: string; author: MessageAuthor };
}

export interface ChatThread {
  id: ID;
  specialistId: ID;
  specialistName: string;
  specialistTitle: string;
  avatarUrl: string | null;
  online: boolean;
  lastSeenLabel: string;
  unread: number;
}

/* ------------------------------- Upload ---------------------------------- */

export type UploadStatus = "validating" | "uploading" | "paused" | "done" | "error" | "canceled";

export interface UploadTask {
  id: ID;
  file: File;
  kind: AttachmentKind;
  previewUrl?: string;
  progress: number; // 0..100
  status: UploadStatus;
  error?: string;
  bytesSent: number;
  startedAt: number;
  speedBps: number;
}

/* ----------------------------- Subscription ------------------------------ */

export interface Subscription {
  id: ID;
  planTitle: string;
  specialistName: string;
  startedAt: string;
  expiresAt: string;
  daysLeft: number;
  totalDays: number;
  status: "active" | "expiring" | "expired";
}

export interface Order {
  id: ID;
  title: string;
  date: string;
  amountToman: number;
  status: "paid" | "refunded" | "pending";
  refId: string;
}
