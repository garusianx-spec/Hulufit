import type { InMemoryRepository, Repository } from "./repository.js";

/**
 * Development fixtures: one specialist, three clients, one thread each.
 * Phone numbers are the sign-in identity — these are the accounts an OTP for
 * `09121112233` and friends resolves to in dev.
 */
export async function seed(repo: Repository) {
  const inMemory = repo as InMemoryRepository;
  const now = new Date().toISOString();

  await repo.upsertUser({
    id: "sp_1",
    role: "specialist",
    name: "دکتر نگار کیانی",
    phone: "+989121112233",
    avatarKey: null,
    createdAt: now,
  });
  await repo.upsertUser({
    id: "admin_1",
    role: "admin",
    name: "مدیر سامانه",
    phone: "+989120000000",
    avatarKey: null,
    createdAt: now,
  });

  const clients = [
    { id: "u_1", name: "سارا رضایی", phone: "+989123456789", thread: "th_1" },
    { id: "u_2", name: "محمد کاظمی", phone: "+989351234567", thread: "th_2" },
    { id: "u_3", name: "نگین شریفی", phone: "+989011234567", thread: "th_3" },
  ];

  for (const client of clients) {
    await repo.upsertUser({
      id: client.id,
      role: "client",
      name: client.name,
      phone: client.phone,
      avatarKey: null,
      createdAt: now,
    });
    inMemory.addThread?.({
      id: client.thread,
      clientId: client.id,
      specialistId: "sp_1",
      createdAt: now,
    });
  }

  await repo.appendMessage({
    threadId: "th_1",
    authorId: "sp_1",
    text: "سلام سارا جان 👋 هفته‌ی ششم برنامه‌ات شروع شده. وزن امروز صبح رو ثبت کردی؟",
  });
  await repo.appendMessage({
    threadId: "th_1",
    authorId: "u_1",
    text: "سلام دکتر. بله، ۷۱٫۲ شد.",
  });
}
