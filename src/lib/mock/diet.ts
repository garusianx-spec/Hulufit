import type { DietPlan, FoodAlternative, MealSlot } from "@/types";

export const MEAL_SLOT_META: Record<MealSlot, { label: string; icon: string; accent: string }> = {
  breakfast: { label: "صبحانه", icon: "🌅", accent: "bg-warn-50 text-warn-600" },
  morningSnack: { label: "میان‌وعده صبح", icon: "🍎", accent: "bg-primary-50 text-primary-700" },
  lunch: { label: "ناهار", icon: "🍲", accent: "bg-sky-50 text-sky-700" },
  afternoonSnack: { label: "میان‌وعده عصر", icon: "🥜", accent: "bg-primary-50 text-primary-700" },
  dinner: { label: "شام", icon: "🌙", accent: "bg-slate-100 text-ink-muted" },
};

export const dietPlan: DietPlan = {
  id: "diet_1",
  title: "برنامه غذایی کاهش وزن – هفته ششم",
  issuedBy: "دکتر نگار کیانی",
  validUntil: "1405/07/12", // rendered through toFa()
  dailyCalories: 1650,
  macroTarget: { protein: 118, carbs: 165, fat: 52 },
  meals: [
    {
      id: "m_bf",
      slot: "breakfast",
      title: "صبحانه",
      timeHint: "۷:۰۰ تا ۸:۳۰",
      note: "قبل از صبحانه یک لیوان آب ولرم بنوشید.",
      items: [
        { id: "f_1", name: "نان سنگک سبوس‌دار", amount: "۲ کف دست", calories: 180, macros: { protein: 6, carbs: 34, fat: 1 }, swappable: true },
        { id: "f_2", name: "پنیر کم‌چرب", amount: "۳۰ گرم", calories: 78, macros: { protein: 7, carbs: 1, fat: 5 }, swappable: true },
        { id: "f_3", name: "تخم‌مرغ آب‌پز", amount: "۱ عدد", calories: 72, macros: { protein: 6, carbs: 0, fat: 5 }, swappable: true },
        { id: "f_4", name: "گردو", amount: "۲ عدد", calories: 52, macros: { protein: 1, carbs: 1, fat: 5 }, swappable: true },
      ],
    },
    {
      id: "m_ms",
      slot: "morningSnack",
      title: "میان‌وعده صبح",
      timeHint: "۱۰:۳۰",
      items: [
        { id: "f_5", name: "سیب متوسط", amount: "۱ عدد", calories: 95, macros: { protein: 0, carbs: 25, fat: 0 }, swappable: true },
        { id: "f_6", name: "چای سبز بدون قند", amount: "۱ لیوان", calories: 2, macros: { protein: 0, carbs: 0, fat: 0 }, swappable: false },
      ],
    },
    {
      id: "m_ln",
      slot: "lunch",
      title: "ناهار",
      timeHint: "۱۳:۰۰ تا ۱۴:۰۰",
      note: "سالاد را با روغن زیتون و لیموترش میل کنید.",
      items: [
        { id: "f_7", name: "سینه مرغ گریل", amount: "۱۲۰ گرم", calories: 198, macros: { protein: 37, carbs: 0, fat: 4 }, swappable: true },
        { id: "f_8", name: "برنج قهوه‌ای", amount: "۴ قاشق غذاخوری", calories: 216, macros: { protein: 5, carbs: 45, fat: 2 }, swappable: true },
        { id: "f_9", name: "سالاد فصل", amount: "۱ کاسه", calories: 60, macros: { protein: 2, carbs: 8, fat: 3 }, swappable: false },
        { id: "f_10", name: "ماست کم‌چرب", amount: "۳ قاشق", calories: 48, macros: { protein: 5, carbs: 5, fat: 1 }, swappable: true },
      ],
    },
    {
      id: "m_as",
      slot: "afternoonSnack",
      title: "میان‌وعده عصر",
      timeHint: "۱۷:۰۰ (قبل از تمرین)",
      items: [
        { id: "f_11", name: "موز کوچک", amount: "۱ عدد", calories: 90, macros: { protein: 1, carbs: 23, fat: 0 }, swappable: true },
        { id: "f_12", name: "بادام خام", amount: "۱۰ عدد", calories: 70, macros: { protein: 3, carbs: 2, fat: 6 }, swappable: true },
      ],
    },
    {
      id: "m_dn",
      slot: "dinner",
      title: "شام",
      timeHint: "۲۰:۰۰ تا ۲۱:۰۰",
      note: "حداقل سه ساعت قبل از خواب میل شود.",
      items: [
        { id: "f_13", name: "ماهی قزل‌آلا فر", amount: "۱۳۰ گرم", calories: 242, macros: { protein: 30, carbs: 0, fat: 13 }, swappable: true },
        { id: "f_14", name: "سبزیجات بخارپز", amount: "۱ بشقاب", calories: 85, macros: { protein: 4, carbs: 14, fat: 1 }, swappable: true },
        { id: "f_15", name: "نان جو", amount: "۱ کف دست", calories: 90, macros: { protein: 3, carbs: 17, fat: 1 }, swappable: true },
      ],
    },
  ],
};

/**
 * Food-swap engine (mock): alternatives are isocaloric within ±۸٪ and
 * macro-matched, which is how the real recommender is specified.
 */
export const foodAlternatives: Record<string, FoodAlternative[]> = {
  f_1: [
    { id: "a_1", name: "نان بربری سبوس‌دار", amount: "۱ کف دست", calories: 175, macros: { protein: 6, carbs: 33, fat: 1 }, swappable: true, reason: "کالری و کربوهیدرات تقریباً برابر" },
    { id: "a_2", name: "جو دوسر پرک", amount: "۴۰ گرم", calories: 152, macros: { protein: 5, carbs: 27, fat: 3 }, swappable: true, reason: "فیبر بالاتر، سیری طولانی‌تر" },
    { id: "a_3", name: "نان تست جو", amount: "۲ برش", calories: 168, macros: { protein: 6, carbs: 30, fat: 2 }, swappable: true, reason: "در دسترس‌تر برای صبح‌های عجله‌ای" },
  ],
  f_3: [
    { id: "a_4", name: "سفیده تخم‌مرغ", amount: "۳ عدد", calories: 51, macros: { protein: 11, carbs: 1, fat: 0 }, swappable: true, reason: "پروتئین بیشتر با چربی صفر" },
    { id: "a_5", name: "پنیر کاتیج", amount: "۵۰ گرم", calories: 49, macros: { protein: 7, carbs: 2, fat: 1 }, swappable: true, reason: "مناسب افرادی که تخم‌مرغ نمی‌خورند" },
  ],
  f_7: [
    { id: "a_6", name: "فیله ماهی سفید", amount: "۱۵۰ گرم", calories: 186, macros: { protein: 36, carbs: 0, fat: 3 }, swappable: true, reason: "امگا-۳ بالاتر" },
    { id: "a_7", name: "بوقلمون گریل", amount: "۱۲۰ گرم", calories: 205, macros: { protein: 35, carbs: 0, fat: 6 }, swappable: true, reason: "پروفایل پروتئینی مشابه" },
    { id: "a_8", name: "عدس پخته + سویا", amount: "۱ پیمانه", calories: 212, macros: { protein: 20, carbs: 30, fat: 2 }, swappable: true, reason: "جایگزین گیاهی" },
  ],
  f_8: [
    { id: "a_9", name: "کینوا پخته", amount: "۵ قاشق", calories: 222, macros: { protein: 8, carbs: 39, fat: 4 }, swappable: true, reason: "شاخص گلیسمی پایین‌تر" },
    { id: "a_10", name: "سیب‌زمینی آب‌پز", amount: "۲۰۰ گرم", calories: 174, macros: { protein: 4, carbs: 40, fat: 0 }, swappable: true, reason: "کربوهیدرات مشابه با کالری کمتر" },
  ],
  f_13: [
    { id: "a_11", name: "مرغ سوخاری فر", amount: "۱۳۰ گرم", calories: 235, macros: { protein: 33, carbs: 4, fat: 9 }, swappable: true, reason: "در دسترس‌تر" },
    { id: "a_12", name: "تن ماهی در آب", amount: "۱ قوطی", calories: 191, macros: { protein: 42, carbs: 0, fat: 2 }, swappable: true, reason: "پروتئین بالا، آماده‌سازی سریع" },
  ],
};

/** Every other item falls back to a generic isocaloric set. */
export const genericAlternatives: FoodAlternative[] = [
  { id: "a_g1", name: "جایگزین هم‌کالری پیشنهادی مربی", amount: "طبق دستور", calories: 0, macros: { protein: 0, carbs: 0, fat: 0 }, swappable: true, reason: "با مربی خود هماهنگ کنید" },
];
