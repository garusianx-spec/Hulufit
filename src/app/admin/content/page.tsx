"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Chip, Sep } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { BellIcon, CheckIcon, SearchIcon } from "@/components/ui/Icons";
import { adminContent, adminOverview, type ContentState } from "@/lib/mock/admin";
import { cx, faDate, faNumber } from "@/lib/format";

const STATE_META: Record<ContentState, { label: string; tone: string }> = {
  published: { label: "منتشرشده", tone: "bg-primary-50 text-primary-700" },
  draft: { label: "پیش‌نویس", tone: "bg-slate-100 text-ink-muted" },
  review: { label: "در انتظار بازبینی", tone: "bg-warn-50 text-warn-600" },
};

const AUDIENCES = [
  { key: "all", label: "همه کاربران", size: adminOverview.users.active },
  { key: "active", label: "دارای برنامه فعال", size: 5_240 },
  { key: "at_risk", label: "در معرض ریزش", size: 1_180 },
  { key: "expired", label: "اشتراک منقضی", size: 2_310 },
] as const;

export default function AdminContentPage() {
  const toast = useToast();
  const [items, setItems] = useState(adminContent);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContentState | "all">("all");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["key"]>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return `${c.title} ${c.category} ${c.author}`.toLowerCase().includes(q);
    });
  }, [filter, items, query]);

  const publish = (id: string) => {
    setItems((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, status: "published" as ContentState, publishedAt: new Date().toISOString() } : r,
      ),
    );
    toast.success("محتوا منتشر شد.");
  };

  const send = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("عنوان و متن اعلان الزامی است.");
      return;
    }
    const segment = AUDIENCES.find((a) => a.key === audience)!;
    // Production: POST /api/v1/admin/broadcast → push provider fan-out.
    setBroadcastOpen(false);
    setTitle("");
    setBody("");
    toast.success(`اعلان برای ${faNumber(segment.size)} کاربر در صف ارسال قرار گرفت.`);
  };

  return (
    <AdminShell
      title="مدیریت محتوا"
      subtitle={`${faNumber(items.length)} مقاله و دستور غذایی`}
      actions={
        <button
          type="button"
          onClick={() => setBroadcastOpen(true)}
          className="app-btn-primary px-3 py-2 text-xs"
        >
          <BellIcon width={15} height={15} />
          اعلان سراسری
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-2.5">
            <SearchIcon width={17} height={17} className="shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی عنوان، دسته یا نویسنده…"
              type="search"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["all", "published", "review", "draft"] as const).map((key) => (
              <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
                {key === "all" ? "همه" : STATE_META[key].label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="app-card overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <span
                  className={cx(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-card text-sm",
                    c.kind === "article" ? "bg-sky-50" : "bg-primary-50",
                  )}
                  aria-hidden="true"
                >
                  {c.kind === "article" ? "📄" : "🥗"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{c.title}</p>
                  <p className="mt-0.5 truncate text-2xs text-ink-muted">
                    {c.category}
                    <Sep />
                    {c.author}
                    <Sep />
                    {c.status === "published" ? faDate(c.publishedAt, true) : "منتشر نشده"}
                    {c.views > 0 && (
                      <>
                        <Sep />
                        {faNumber(c.views)} بازدید
                      </>
                    )}
                  </p>
                </div>

                <span
                  className={cx("shrink-0 rounded-pill px-2 py-0.5 text-[0.6rem] font-bold", STATE_META[c.status].tone)}
                >
                  {STATE_META[c.status].label}
                </span>

                {c.status !== "published" && (
                  <button
                    type="button"
                    onClick={() => publish(c.id)}
                    className="app-btn-primary shrink-0 px-3 py-1.5 text-2xs"
                  >
                    <CheckIcon width={13} height={13} />
                    انتشار
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Sheet
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        variant="modal"
        title="ارسال اعلان سراسری"
        subtitle="اعلان از طریق Web Push به دستگاه کاربران ارسال می‌شود."
        footer={
          <button type="button" onClick={send} className="app-btn-primary w-full">
            <BellIcon width={16} height={16} />
            ارسال به صف
          </button>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          <label className="block">
            <span className="mb-1 block text-2xs text-ink-muted">عنوان</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: برنامه هفته جدید آماده است"
              className="w-full rounded-card border border-line bg-canvas px-3 py-2.5 text-xs text-ink outline-none focus:border-primary-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-2xs text-ink-muted">متن</span>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="متن کوتاه و روشن؛ روی قفل صفحه نمایش داده می‌شود."
              className="w-full resize-none rounded-card border border-line bg-canvas px-3 py-2.5 text-xs leading-6 text-ink outline-none focus:border-primary-500"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-2xs text-ink-muted">مخاطب</span>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <Chip key={a.key} active={audience === a.key} onClick={() => setAudience(a.key)}>
                  {a.label} ({faNumber(a.size)})
                </Chip>
              ))}
            </div>
          </div>

          <Card className="bg-canvas">
            <p className="text-2xs text-ink-muted">پیش‌نمایش روی دستگاه</p>
            <div className="mt-2 rounded-card border border-line bg-surface p-3">
              <p className="text-xs font-extrabold text-ink">{title || "عنوان اعلان"}</p>
              <p className="mt-1 text-2xs leading-5 text-ink-muted">
                {body || "متن اعلان اینجا نمایش داده می‌شود."}
              </p>
              <p className="mt-1.5 text-[0.6rem] text-ink-soft">هلوفیت · هم‌اکنون</p>
            </div>
          </Card>
        </div>
      </Sheet>
    </AdminShell>
  );
}
