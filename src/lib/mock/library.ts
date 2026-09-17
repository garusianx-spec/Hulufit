import type { DraftExercise, DraftMealItem, DraftSupplement, MuscleGroup } from "@/types";

/** Food catalogue the diet builder picks from. Values are per stated amount. */
export const FOOD_LIBRARY: Array<DraftMealItem & { tags: string[] }> = [
  { id: "lib_f1", name: "نان سنگک سبوس‌دار", amount: "۲ کف دست", calories: 180, macros: { protein: 6, carbs: 34, fat: 1 }, tags: ["نان", "صبحانه"] },
  { id: "lib_f2", name: "جو دوسر پرک", amount: "۴۰ گرم", calories: 152, macros: { protein: 5, carbs: 27, fat: 3 }, tags: ["غلات", "صبحانه"] },
  { id: "lib_f3", name: "تخم‌مرغ آب‌پز", amount: "۱ عدد", calories: 72, macros: { protein: 6, carbs: 0, fat: 5 }, tags: ["پروتئین", "صبحانه"] },
  { id: "lib_f4", name: "سفیده تخم‌مرغ", amount: "۳ عدد", calories: 51, macros: { protein: 11, carbs: 1, fat: 0 }, tags: ["پروتئین"] },
  { id: "lib_f5", name: "پنیر کم‌چرب", amount: "۳۰ گرم", calories: 78, macros: { protein: 7, carbs: 1, fat: 5 }, tags: ["لبنیات"] },
  { id: "lib_f6", name: "ماست کم‌چرب", amount: "۱۰۰ گرم", calories: 60, macros: { protein: 6, carbs: 6, fat: 1 }, tags: ["لبنیات"] },
  { id: "lib_f7", name: "سینه مرغ گریل", amount: "۱۲۰ گرم", calories: 198, macros: { protein: 37, carbs: 0, fat: 4 }, tags: ["پروتئین", "ناهار"] },
  { id: "lib_f8", name: "ماهی قزل‌آلا فر", amount: "۱۳۰ گرم", calories: 242, macros: { protein: 30, carbs: 0, fat: 13 }, tags: ["پروتئین", "شام"] },
  { id: "lib_f9", name: "تن ماهی در آب", amount: "۱ قوطی", calories: 191, macros: { protein: 42, carbs: 0, fat: 2 }, tags: ["پروتئین"] },
  { id: "lib_f10", name: "گوشت قرمز بدون چربی", amount: "۱۰۰ گرم", calories: 214, macros: { protein: 26, carbs: 0, fat: 12 }, tags: ["پروتئین"] },
  { id: "lib_f11", name: "عدس پخته", amount: "۱ پیمانه", calories: 212, macros: { protein: 18, carbs: 36, fat: 1 }, tags: ["حبوبات", "گیاهی"] },
  { id: "lib_f12", name: "نخود پخته", amount: "۱ پیمانه", calories: 269, macros: { protein: 15, carbs: 45, fat: 4 }, tags: ["حبوبات", "گیاهی"] },
  { id: "lib_f13", name: "برنج قهوه‌ای", amount: "۴ قاشق غذاخوری", calories: 216, macros: { protein: 5, carbs: 45, fat: 2 }, tags: ["کربوهیدرات"] },
  { id: "lib_f14", name: "کینوا پخته", amount: "۵ قاشق", calories: 222, macros: { protein: 8, carbs: 39, fat: 4 }, tags: ["کربوهیدرات"] },
  { id: "lib_f15", name: "سیب‌زمینی آب‌پز", amount: "۲۰۰ گرم", calories: 174, macros: { protein: 4, carbs: 40, fat: 0 }, tags: ["کربوهیدرات"] },
  { id: "lib_f16", name: "سالاد فصل", amount: "۱ کاسه", calories: 60, macros: { protein: 2, carbs: 8, fat: 3 }, tags: ["سبزیجات"] },
  { id: "lib_f17", name: "سبزیجات بخارپز", amount: "۱ بشقاب", calories: 85, macros: { protein: 4, carbs: 14, fat: 1 }, tags: ["سبزیجات"] },
  { id: "lib_f18", name: "سیب متوسط", amount: "۱ عدد", calories: 95, macros: { protein: 0, carbs: 25, fat: 0 }, tags: ["میوه", "میان‌وعده"] },
  { id: "lib_f19", name: "موز کوچک", amount: "۱ عدد", calories: 90, macros: { protein: 1, carbs: 23, fat: 0 }, tags: ["میوه", "میان‌وعده"] },
  { id: "lib_f20", name: "بادام خام", amount: "۱۰ عدد", calories: 70, macros: { protein: 3, carbs: 2, fat: 6 }, tags: ["آجیل", "میان‌وعده"] },
  { id: "lib_f21", name: "گردو", amount: "۲ عدد", calories: 52, macros: { protein: 1, carbs: 1, fat: 5 }, tags: ["آجیل"] },
  { id: "lib_f22", name: "کره بادام‌زمینی", amount: "۱ قاشق", calories: 94, macros: { protein: 4, carbs: 3, fat: 8 }, tags: ["چربی"] },
  { id: "lib_f23", name: "روغن زیتون", amount: "۱ قاشق چای‌خوری", calories: 40, macros: { protein: 0, carbs: 0, fat: 4.5 }, tags: ["چربی"] },
  { id: "lib_f24", name: "وی پروتئین", amount: "۱ اسکوپ", calories: 120, macros: { protein: 25, carbs: 3, fat: 1 }, tags: ["مکمل", "پروتئین"] },
];

export const FOOD_TAGS = [
  "صبحانه",
  "ناهار",
  "شام",
  "میان‌وعده",
  "پروتئین",
  "کربوهیدرات",
  "چربی",
  "سبزیجات",
  "میوه",
  "لبنیات",
  "حبوبات",
  "گیاهی",
];

/** Exercise catalogue the workout builder picks from. */
export const EXERCISE_LIBRARY: Array<Omit<DraftExercise, "note"> & { tags: MuscleGroup[] }> = [
  { id: "lib_e1", name: "اسکوات هالتر", latinName: "Barbell Back Squat", targets: ["legs", "glutes"], sets: 4, reps: 10, weightKg: 35, restSeconds: 90, previewUrl: "/media/exercises/squat.svg", tags: ["legs"] },
  { id: "lib_e2", name: "ددلیفت رومانیایی", latinName: "Romanian Deadlift", targets: ["legs", "back", "glutes"], sets: 3, reps: 12, weightKg: 30, restSeconds: 75, previewUrl: "/media/exercises/deadlift.svg", tags: ["legs"] },
  { id: "lib_e3", name: "لانج راه‌رونده دمبل", latinName: "Walking Lunge", targets: ["legs", "glutes"], sets: 3, reps: 14, weightKg: 8, restSeconds: 60, previewUrl: "/media/exercises/lunge.svg", tags: ["legs"] },
  { id: "lib_e4", name: "پل باسن", latinName: "Hip Thrust", targets: ["glutes", "core"], sets: 3, reps: 15, weightKg: 25, restSeconds: 60, previewUrl: "/media/exercises/hipthrust.svg", tags: ["glutes"] },
  { id: "lib_e5", name: "پرس سینه دمبل", latinName: "Dumbbell Bench Press", targets: ["chest"], sets: 4, reps: 10, weightKg: 12, restSeconds: 75, previewUrl: "/media/exercises/benchpress.svg", tags: ["chest"] },
  { id: "lib_e6", name: "شنا سوئدی", latinName: "Push-Up", targets: ["chest", "arms", "core"], sets: 3, reps: 12, restSeconds: 60, previewUrl: "/media/exercises/pushup.svg", tags: ["chest"] },
  { id: "lib_e7", name: "پرس سرشانه نشسته", latinName: "Seated Shoulder Press", targets: ["shoulders"], sets: 3, reps: 10, weightKg: 10, restSeconds: 60, previewUrl: "/media/exercises/shoulderpress.svg", tags: ["shoulders"] },
  { id: "lib_e8", name: "نشر جانب", latinName: "Lateral Raise", targets: ["shoulders"], sets: 3, reps: 15, weightKg: 5, restSeconds: 45, previewUrl: "/media/exercises/lateralraise.svg", tags: ["shoulders"] },
  { id: "lib_e9", name: "زیربغل سیم‌کش", latinName: "Lat Pulldown", targets: ["back"], sets: 4, reps: 10, weightKg: 30, restSeconds: 75, previewUrl: "/media/exercises/latpulldown.svg", tags: ["back"] },
  { id: "lib_e10", name: "پارویی دمبل تک‌دست", latinName: "One-Arm Dumbbell Row", targets: ["back"], sets: 3, reps: 12, weightKg: 12, restSeconds: 60, previewUrl: "/media/exercises/row.svg", tags: ["back"] },
  { id: "lib_e11", name: "جلو بازو هالتر", latinName: "Barbell Curl", targets: ["arms"], sets: 3, reps: 12, weightKg: 15, restSeconds: 45, previewUrl: "/media/exercises/curl.svg", tags: ["arms"] },
  { id: "lib_e12", name: "پشت بازو طناب", latinName: "Triceps Pushdown", targets: ["arms"], sets: 3, reps: 12, weightKg: 17, restSeconds: 45, previewUrl: "/media/exercises/pushdown.svg", tags: ["arms"] },
  { id: "lib_e13", name: "پلانک", latinName: "Plank", targets: ["core"], sets: 3, reps: 45, restSeconds: 45, previewUrl: "/media/exercises/plank.svg", tags: ["core"] },
  { id: "lib_e14", name: "کوهنورد", latinName: "Mountain Climber", targets: ["core", "cardio"], sets: 3, reps: 30, restSeconds: 45, previewUrl: "/media/exercises/mountainclimber.svg", tags: ["core"] },
  { id: "lib_e15", name: "برپی", latinName: "Burpee", targets: ["fullBody", "cardio"], sets: 3, reps: 10, restSeconds: 60, previewUrl: "/media/exercises/burpee.svg", tags: ["fullBody"] },
  { id: "lib_e16", name: "کتل‌بل سوئینگ", latinName: "Kettlebell Swing", targets: ["glutes", "core", "cardio"], sets: 3, reps: 15, weightKg: 12, restSeconds: 60, previewUrl: "/media/exercises/kbswing.svg", tags: ["fullBody"] },
  { id: "lib_e17", name: "تردمیل شیب‌دار", latinName: "Incline Treadmill Walk", targets: ["cardio"], sets: 1, reps: 25, restSeconds: 0, previewUrl: "/media/exercises/treadmill.svg", tags: ["cardio"] },
];

/** Common supplement presets, so the scheduler is one tap for the usual cases. */
export const SUPPLEMENT_LIBRARY: Array<Omit<DraftSupplement, "id">> = [
  { name: "ویتامین D۳", latinName: "Vitamin D3 1000 IU", kind: "supplement", dosage: "۱ عدد", window: "morning", timeLabel: "۸:۰۰", withFood: true, note: "همراه صبحانه؛ جذب با چربی بهتر است.", reminderOn: true },
  { name: "امگا ۳", latinName: "Omega-3 1000mg", kind: "supplement", dosage: "۲ کپسول", window: "morning", timeLabel: "۸:۰۰", withFood: true, note: "", reminderOn: true },
  { name: "مولتی‌ویتامین", latinName: "Multivitamin", kind: "supplement", dosage: "۱ عدد", window: "morning", timeLabel: "۸:۳۰", withFood: true, note: "", reminderOn: true },
  { name: "آهن + ویتامین C", latinName: "Ferrous Sulfate", kind: "medicine", dosage: "۱ قرص", window: "afternoon", timeLabel: "۱۵:۰۰", withFood: false, note: "همراه لبنیات مصرف نشود.", reminderOn: true },
  { name: "کراتین مونوهیدرات", latinName: "Creatine Monohydrate", kind: "supplement", dosage: "۵ گرم", window: "preWorkout", timeLabel: "۱۷:۳۰", withFood: false, note: "", reminderOn: true },
  { name: "وی پروتئین", latinName: "Whey Protein Isolate", kind: "supplement", dosage: "۱ اسکوپ", window: "postWorkout", timeLabel: "۱۹:۴۵", withFood: false, note: "تا ۳۰ دقیقه بعد از تمرین.", reminderOn: true },
  { name: "منیزیم سیترات", latinName: "Magnesium Citrate 200mg", kind: "supplement", dosage: "۱ عدد", window: "bedtime", timeLabel: "۲۳:۰۰", withFood: false, note: "به کیفیت خواب کمک می‌کند.", reminderOn: true },
  { name: "زینک", latinName: "Zinc Gluconate 15mg", kind: "supplement", dosage: "۱ عدد", window: "bedtime", timeLabel: "۲۳:۰۰", withFood: false, note: "", reminderOn: true },
  { name: "لووتیروکسین", latinName: "Levothyroxine 50µg", kind: "medicine", dosage: "۱ قرص", window: "morning", timeLabel: "۷:۰۰", withFood: false, note: "ناشتا، نیم ساعت قبل از صبحانه.", reminderOn: true },
  { name: "متفورمین", latinName: "Metformin 500mg", kind: "medicine", dosage: "۱ قرص", window: "afternoon", timeLabel: "۱۴:۰۰", withFood: true, note: "همراه ناهار.", reminderOn: true },
];
