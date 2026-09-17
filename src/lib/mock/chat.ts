import type { ChatMessage, ChatThread } from "@/types";

export const chatThread: ChatThread = {
  id: "th_1",
  specialistId: "sp_1",
  specialistName: "دکتر نگار کیانی",
  specialistTitle: "متخصص تغذیه بالینی",
  avatarUrl: null,
  online: true,
  lastSeenLabel: "آنلاین",
  unread: 0,
};

function at(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

/**
 * Seed page of the transcript. Older pages come from the paginated REST
 * fallback (`GET /api/threads/:id/messages?before=…`) — see chatHistoryPage().
 */
export const seedMessages: ChatMessage[] = [
  {
    id: "msg_1",
    author: "coach",
    text: "سلام سارا جان 👋 هفته‌ی ششم برنامه‌ات شروع شده. وزن امروز صبح رو ثبت کردی؟",
    createdAt: at(26),
    status: "read",
  },
  {
    id: "msg_2",
    author: "me",
    text: "سلام دکتر. بله، ۷۱٫۲ شد. نسبت به هفته قبل ۴۰۰ گرم کم شده.",
    createdAt: at(25),
    status: "read",
  },
  {
    id: "msg_3",
    author: "coach",
    text: "عالیه! روند کاهش وزنت دقیقاً در محدوده‌ی سالم و پایداره. برنامه‌ی جدید هفته رو برات فرستادم.",
    createdAt: at(25),
    status: "read",
  },
  {
    id: "msg_4",
    author: "coach",
    createdAt: at(24),
    status: "read",
    attachment: {
      id: "att_1",
      kind: "pdf",
      name: "برنامه-غذایی-هفته-ششم.pdf",
      sizeBytes: 2_411_724,
      mime: "application/pdf",
      url: "#",
    },
  },
  {
    id: "msg_5",
    author: "me",
    text: "ممنون 🌿 آزمایش خون جدیدم هم آماده شد، براتون می‌فرستم.",
    createdAt: at(6),
    status: "read",
  },
  {
    id: "msg_6",
    author: "me",
    createdAt: at(6),
    status: "read",
    attachment: {
      id: "att_2",
      kind: "lab",
      name: "آزمایش-خون-مهر-۱۴۰۵.pdf",
      sizeBytes: 5_872_640,
      mime: "application/pdf",
      url: "#",
    },
  },
  {
    id: "msg_7",
    author: "coach",
    text: "دیدمش. ویتامین D سرمی ۱۹ هست که پایین‌تر از حد مطلوبه. دوز مکمل رو از این هفته تنظیم می‌کنم.",
    createdAt: at(5),
    status: "read",
  },
  {
    id: "msg_8",
    author: "coach",
    createdAt: at(5),
    status: "read",
    attachment: {
      id: "att_3",
      kind: "audio",
      name: "توضیح-صوتی-مکمل.m4a",
      sizeBytes: 842_112,
      mime: "audio/mp4",
      url: "#",
      durationSec: 47,
    },
  },
  {
    id: "msg_9",
    author: "me",
    text: "خیلی ممنون، گوش دادم. یک سؤال: شام رو می‌تونم قبل از تمرین بخورم؟",
    createdAt: at(2),
    status: "delivered",
  },
];

/** REST fallback page (older history), returned by the paginated fetch. */
export function chatHistoryPage(before: string, limit = 12): { messages: ChatMessage[]; hasMore: boolean } {
  const anchor = new Date(before).getTime();
  const out: ChatMessage[] = [];
  const samples = [
    { author: "coach" as const, text: "صبح بخیر! یادت نره امروز وزن بگیری." },
    { author: "me" as const, text: "چشم دکتر، ثبت کردم." },
    { author: "coach" as const, text: "میان‌وعده‌ی عصر رو حتماً بخور تا شام پرخوری نکنی." },
    { author: "me" as const, text: "امروز تمرین پا رو کامل انجام دادم 💪" },
    { author: "coach" as const, text: "آفرین! فردا حتماً کشش و ریکاوری داشته باش." },
    { author: "me" as const, text: "آب امروزم ۲ لیتر شد." },
  ];

  for (let i = 0; i < limit; i += 1) {
    const sample = samples[i % samples.length];
    out.push({
      id: `hist_${anchor}_${i}`,
      author: sample.author,
      text: sample.text,
      createdAt: new Date(anchor - (i + 1) * 45 * 60 * 1000).toISOString(),
      status: "read",
    });
  }

  // Oldest first, matching the ascending order the message list renders.
  out.reverse();
  const hasMore = anchor > Date.now() - 1000 * 60 * 60 * 24 * 9;
  return { messages: out, hasMore };
}

export const quickReplies = [
  "برنامه امروزم رو کامل انجام دادم ✅",
  "یک وعده رو نتونستم بخورم",
  "می‌تونم جایگزین پیشنهاد بدید؟",
  "وزن امروزم رو ثبت کردم",
];
