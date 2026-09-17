"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Avatar, Card, ProgressBar, Section, Sep, Stat, Toggle } from "@/components/ui/Bits";
import { AvatarUploadCropModal } from "@/components/profile/AvatarUploadCropModal";
import { WeightTrendChart } from "@/components/profile/WeightTrendChart";
import { BmiGauge } from "@/components/profile/BmiGauge";
import { CameraIcon, ChevronLeft, ClockIcon, ShieldIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { measurements, orders, subscription } from "@/lib/mock/user";
import { cx, faDate, faNumber, faToman } from "@/lib/format";

const PREFERENCES = [
  { key: "reminders", label: "یادآور مکمل و دارو", hint: "اعلان در ساعت‌های تعیین‌شده", on: true },
  { key: "coachMessages", label: "پیام‌های مشاور", hint: "اعلان پیام جدید در گفتگو", on: true },
  { key: "weeklyReport", label: "گزارش هفتگی", hint: "خلاصه پیشرفت هر پنج‌شنبه", on: true },
  { key: "waterNudge", label: "یادآور نوشیدن آب", hint: "هر دو ساعت در طول روز", on: false },
];

export default function ProfilePage() {
  const { user, weights, dispatch } = useAppStore();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(PREFERENCES.map((p) => [p.key, p.on])) as Record<string, boolean>,
  );

  const latest = measurements[measurements.length - 1];
  const previous = measurements[measurements.length - 2];
  const lost = user.startWeightKg - user.currentWeightKg;
  const toGo = Math.max(0, user.currentWeightKg - user.targetWeightKg);
  const goalPct = (lost / Math.max(0.1, user.startWeightKg - user.targetWeightKg)) * 100;

  return (
    <AppShell header={<AppHeader variant="page" title="پروفایل و ترکر" backHref="/" />}>
      <PullToRefresh onRefresh={async () => new Promise((r) => setTimeout(r, 700))}>
        <div className="flex flex-col gap-4 pt-4">
          {/* Identity + avatar management */}
          <div className="px-4">
            <Card className="flex flex-col items-center gap-3 py-5">
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="relative"
                aria-label="تغییر تصویر پروفایل"
              >
                <Avatar
                  src={user.avatarUrl}
                  name={`${user.firstName} ${user.lastName}`}
                  size={92}
                  ring
                />
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-0 left-0 grid h-8 w-8 place-items-center rounded-pill border-2 border-surface bg-primary-600 text-white"
                >
                  <CameraIcon width={15} height={15} />
                </motion.span>
              </button>

              <div className="text-center">
                <p className="text-base font-extrabold text-ink">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-0.5 text-2xs text-ink-muted">
                  عضو هلوفیت از {faDate(user.joinedAt, true)}
                </p>
              </div>

              <div className="grid w-full grid-cols-4 gap-1 border-t border-line pt-3">
                <Stat label="قد (cm)" value={user.heightCm} />
                <Stat label="وزن فعلی" value={faNumber(user.currentWeightKg, 1)} tone="primary" />
                <Stat label="هدف" value={faNumber(user.targetWeightKg, 1)} tone="sky" />
                <Stat label="کم‌شده" value={faNumber(lost, 1)} tone="warn" />
              </div>
            </Card>
          </div>

          {/* Goal progress */}
          <div className="px-4">
            <Card className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-ink">پیشرفت تا هدف</p>
                <p className="text-xs font-extrabold text-primary-700">{faNumber(goalPct)}٪</p>
              </div>
              <ProgressBar value={goalPct} height={10} />
              <p className="text-2xs text-ink-muted">
                {faNumber(lost, 1)} کیلوگرم کم کرده‌اید
                <Sep />
                {faNumber(toGo, 1)} کیلوگرم تا هدف باقی مانده
              </p>
            </Card>
          </div>

          <div className="px-4">
            <WeightTrendChart entries={weights} targetKg={user.targetWeightKg} />
          </div>

          <div className="px-4">
            <BmiGauge weightKg={user.currentWeightKg} heightCm={user.heightCm} />
          </div>

          {/* Body measurements */}
          <Section title="اندازه‌های بدن">
            <Card className="flex flex-col gap-2.5">
              <p className="text-2xs text-ink-muted">
                آخرین ثبت: {faDate(latest.date, true)}
                <Sep />
                مقایسه با {faDate(previous.date)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Measure label="دور کمر" now={latest.waistCm} before={previous.waistCm} />
                <Measure label="دور باسن" now={latest.hipCm} before={previous.hipCm} />
                <Measure label="دور سینه" now={latest.chestCm} before={previous.chestCm} />
                <Measure label="دور بازو" now={latest.armCm} before={previous.armCm} />
                <Measure label="دور ران" now={latest.thighCm} before={previous.thighCm} />
              </div>
              <button type="button" className="app-btn-ghost w-full">
                ثبت اندازه‌های جدید
              </button>
            </Card>
          </Section>

          {/* Subscription */}
          <Section title="اشتراک من">
            <Card className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-ink">{subscription.planTitle}</p>
                  <p className="mt-0.5 text-2xs text-ink-muted">با {subscription.specialistName}</p>
                </div>
                <span className="app-chip app-chip-active shrink-0">
                  <ShieldIcon width={12} height={12} />
                  فعال
                </span>
              </div>
              <ProgressBar
                value={((subscription.totalDays - subscription.daysLeft) / subscription.totalDays) * 100}
                height={8}
              />
              <div className="flex items-center justify-between text-2xs text-ink-muted">
                <span className="flex items-center gap-1">
                  <ClockIcon width={12} height={12} />
                  {faNumber(subscription.daysLeft)} روز باقی‌مانده
                </span>
                <span>پایان: {faDate(subscription.expiresAt, true)}</span>
              </div>
              <Link href="/specialists" className="app-btn-primary w-full">
                تمدید اشتراک
              </Link>
            </Card>
          </Section>

          {/* Orders */}
          <Section title="تاریخچه سفارش‌ها">
            <Card className="divide-y divide-line p-0">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{order.title}</p>
                    <p className="mt-0.5 text-2xs text-ink-muted">
                      {faDate(order.date, true)}
                      <Sep />
                      کد پیگیری {order.refId}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-xs font-extrabold text-ink">{faToman(order.amountToman)}</p>
                    <p
                      className={cx(
                        "mt-0.5 text-[0.58rem] font-bold",
                        order.status === "paid"
                          ? "text-primary-700"
                          : order.status === "refunded"
                            ? "text-ink-soft"
                            : "text-warn-600",
                      )}
                    >
                      {order.status === "paid" ? "پرداخت‌شده" : order.status === "refunded" ? "مسترد شده" : "در انتظار"}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </Section>

          {/* Preferences */}
          <Section title="تنظیمات برنامه">
            <Card className="divide-y divide-line p-0">
              {PREFERENCES.map((pref) => (
                <div key={pref.key} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink">{pref.label}</p>
                    <p className="mt-0.5 text-2xs text-ink-muted">{pref.hint}</p>
                  </div>
                  <Toggle
                    checked={prefs[pref.key]}
                    label={pref.label}
                    onChange={() => setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))}
                  />
                </div>
              ))}

              <Link href="/articles" className="flex items-center gap-3 p-3.5">
                <span className="flex-1 text-xs font-bold text-ink">مقالات ذخیره‌شده</span>
                <ChevronLeft width={16} height={16} className="text-ink-soft" />
              </Link>
            </Card>
          </Section>

          <p className="px-4 text-center text-2xs text-ink-soft">
            هلوفیت
            <Sep />
            نسخه ۱٫۰٫۰
          </p>
        </div>
        <NavSpacer />
      </PullToRefresh>

      <AvatarUploadCropModal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        currentAvatar={user.avatarUrl}
        onSave={(dataUrl) => dispatch({ type: "avatar/set", dataUrl })}
        onRemove={() => dispatch({ type: "avatar/set", dataUrl: null })}
      />
    </AppShell>
  );
}

function Measure({ label, now, before }: { label: string; now: number; before: number }) {
  const delta = now - before;
  return (
    <div className="rounded-card border border-line p-2.5">
      <p className="text-2xs text-ink-muted">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <p className="text-sm font-extrabold text-ink">{faNumber(now, 1)}</p>
        <span className="text-2xs text-ink-soft">cm</span>
        {delta !== 0 && (
          <span
            className={cx(
              "mr-auto text-[0.6rem] font-bold",
              delta < 0 ? "text-primary-700" : "text-warn-600",
            )}
          >
            {delta < 0 ? "▼" : "▲"} <span dir="ltr">{faNumber(Math.abs(delta), 1)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
