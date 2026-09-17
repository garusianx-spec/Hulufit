"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, Toggle } from "@/components/ui/Bits";
import { BellIcon, ClockIcon, DumbbellIcon, PillIcon, AppleIcon, ChatIcon } from "@/components/ui/Icons";
import { useNotificationCenter } from "@/lib/notifications/NotificationProvider";
import { faUntil } from "@/lib/notifications/scheduler";
import { cx, faNumber, faRelative } from "@/lib/format";
import type { NotificationChannel } from "@/types";

const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; hint: string; icon: React.ReactNode; tone: string }
> = {
  meals: {
    label: "وعده‌های غذایی",
    hint: "یادآور هر وعده طبق ساعت برنامه",
    icon: <AppleIcon width={17} height={17} />,
    tone: "bg-primary-50 text-primary-700",
  },
  supplements: {
    label: "مکمل و دارو",
    hint: "سر ساعت مصرف، با دوز تعیین‌شده",
    icon: <PillIcon width={17} height={17} />,
    tone: "bg-sky-50 text-sky-700",
  },
  workout: {
    label: "جلسه تمرین",
    hint: "پیش از شروع تمرین امروز",
    icon: <DumbbellIcon width={17} height={17} />,
    tone: "bg-warn-50 text-warn-600",
  },
  chat: {
    label: "پیام مشاور",
    hint: "پیام جدید در گفتگوی مشاوره",
    icon: <ChatIcon width={17} height={17} />,
    tone: "bg-slate-100 text-ink-muted",
  },
};

/**
 * Inbox + channel settings in one sheet.
 *
 * This is also the graceful fallback: with permission denied nothing reaches
 * the OS, but every reminder still lands here, so the plan is never silently
 * missed.
 */
export function NotificationInbox({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const {
    inbox,
    unread,
    markRead,
    markAllRead,
    clear,
    channels,
    setChannel,
    schedule,
    permission,
    supported,
    request,
  } = useNotificationCenter();

  const upcoming = schedule.filter((s) => s.at > Date.now()).slice(0, 3);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="اعلان‌ها"
      subtitle={unread > 0 ? `${faNumber(unread)} اعلان خوانده‌نشده` : "همه‌ی اعلان‌ها خوانده شده"}
      maxHeight="88vh"
      footer={
        inbox.length > 0 ? (
          <div className="flex gap-2">
            <button type="button" onClick={clear} className="app-btn-ghost flex-1 py-2 text-xs">
              پاک کردن همه
            </button>
            <button
              type="button"
              onClick={markAllRead}
              className="app-btn-primary flex-1 py-2 text-xs"
            >
              علامت‌گذاری خوانده‌شده
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {supported && permission !== "granted" && (
          <div className="rounded-card border border-warn-100 bg-warn-50 p-3">
            <p className="text-2xs font-bold text-warn-600">
              {permission === "denied"
                ? "اعلان سیستمی مسدود است — یادآورها فقط همین‌جا نمایش داده می‌شوند."
                : "اعلان سیستمی هنوز فعال نیست."}
            </p>
            {permission === "default" && (
              <button
                type="button"
                onClick={() => void request()}
                className="app-btn-primary mt-2 w-full py-2 text-xs"
              >
                فعال‌سازی اعلان‌ها
              </button>
            )}
          </div>
        )}

        {/* Channels */}
        <section>
          <h3 className="mb-2 text-xs font-extrabold text-ink">کانال‌های یادآوری</h3>
          <div className="app-card divide-y divide-line p-0">
            {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((key) => {
              const meta = CHANNEL_META[key];
              return (
                <div key={key} className="flex items-center gap-3 p-3">
                  <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-pill", meta.tone)}>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink">{meta.label}</p>
                    <p className="mt-0.5 text-2xs text-ink-muted">{meta.hint}</p>
                  </div>
                  <Toggle
                    checked={channels[key]}
                    label={meta.label}
                    onChange={() => setChannel(key, !channels[key])}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Next up */}
        {upcoming.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-ink">یادآورهای بعدی امروز</h3>
            <ul className="app-card divide-y divide-line p-0">
              {upcoming.map((item) => (
                <li key={item.key} className="flex items-center gap-2.5 p-3">
                  <span
                    className={cx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-pill",
                      CHANNEL_META[item.channel].tone,
                    )}
                  >
                    {CHANNEL_META[item.channel].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-2xs font-bold text-ink">{item.title}</p>
                    <p className="mt-0.5 truncate text-2xs text-ink-muted">{item.body}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[0.6rem] text-ink-soft">
                    <ClockIcon width={11} height={11} />
                    {faUntil(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* History */}
        <section>
          <h3 className="mb-2 text-xs font-extrabold text-ink">تاریخچه</h3>
          {inbox.length === 0 ? (
            <EmptyState
              icon={<BellIcon width={24} height={24} />}
              title="فعلاً اعلانی نیست"
              description="یادآورهای وعده‌ها، مکمل‌ها و پیام‌های مشاور اینجا ثبت می‌شوند."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {inbox.map((item) => (
                <motion.li key={item.id} layout>
                  <button
                    type="button"
                    onClick={() => {
                      markRead(item.id);
                      onClose();
                      router.push(item.url);
                    }}
                    className={cx(
                      "flex w-full items-start gap-2.5 rounded-card border p-3 text-right transition-colors",
                      item.read ? "border-line bg-surface" : "border-primary-200 bg-primary-50/50",
                    )}
                  >
                    <span
                      className={cx(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-pill",
                        CHANNEL_META[item.channel].tone,
                      )}
                    >
                      {CHANNEL_META[item.channel].icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-2xs font-extrabold text-ink">{item.title}</span>
                        {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />}
                      </span>
                      <span className="mt-0.5 block text-2xs leading-5 text-ink-muted">{item.body}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-[0.6rem] text-ink-soft">
                        {faRelative(item.at)}
                        {item.inAppOnly && (
                          <span className="rounded-pill bg-canvas px-1.5 py-0.5 font-bold">
                            فقط داخل برنامه
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
