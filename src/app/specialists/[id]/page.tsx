"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar, Card, EmptyState } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ChatIcon, CheckIcon, ClockIcon, CoachIcon, ShieldIcon, StarIcon } from "@/components/ui/Icons";
import { SPECIALIST_KIND_LABEL, findSpecialist } from "@/lib/mock/specialists";
import { chatThread } from "@/lib/mock/chat";
import { cx, faNumber, faToman } from "@/lib/format";
import type { Package } from "@/types";

const REVIEWS = [
  { name: "مینا ک.", rating: 5, text: "برنامه کاملاً شخصی‌سازی شده بود و پاسخگویی عالی داشتند. ۶ کیلو در دو ماه کم کردم." },
  { name: "رضا ط.", rating: 5, text: "برای کبد چرب مراجعه کردم؛ آنزیم‌های کبدی بعد از سه ماه نرمال شد." },
  { name: "شیوا ن.", rating: 4, text: "برنامه خوب بود، فقط کاش پاسخ‌دهی در روزهای تعطیل هم سریع‌تر بود." },
];

export default function SpecialistProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const specialist = findSpecialist(typeof params?.id === "string" ? params.id : "");

  const [selected, setSelected] = useState<Package | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (!specialist) {
    return (
      <AppShell header={<AppHeader variant="page" title="مشاور" backHref="/specialists" />}>
        <EmptyState
          icon={<CoachIcon width={24} height={24} />}
          title="این متخصص در دسترس نیست"
          action={
            <Link href="/specialists" className="app-btn-ghost mt-2">
              بازگشت به فهرست
            </Link>
          }
        />
      </AppShell>
    );
  }

  const confirm = () => {
    setBookingOpen(false);
    toast.success(`«${selected?.title}» رزرو شد. مشاور تا ${specialist.nextSlot} پاسخ می‌دهد.`);
    setTimeout(() => router.push(`/chat/${chatThread.id}`), 900);
  };

  return (
    <AppShell
      withNav={false}
      header={<AppHeader variant="page" title={specialist.name} subtitle={specialist.title} backHref="/specialists" />}
    >
      <div className="scroll-pane flex-1">
        <div className="flex flex-col gap-3 px-4 pt-4">
          {/* Identity */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar src={specialist.avatarUrl} name={specialist.name} size={64} ring />
                {specialist.online && (
                  <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full bg-primary-500 ring-2 ring-surface" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-ink">{specialist.name}</p>
                <p className="mt-0.5 text-2xs text-ink-muted">{specialist.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-[0.6rem] font-bold text-primary-700">
                    {SPECIALIST_KIND_LABEL[specialist.kind]}
                  </span>
                  <span className="flex items-center gap-0.5 rounded-pill bg-warn-50 px-2 py-0.5 text-[0.6rem] font-extrabold text-warn-600">
                    <StarIcon width={11} height={11} fill="currentColor" />
                    {faNumber(specialist.rating, 1)} ({faNumber(specialist.reviewsCount)})
                  </span>
                  <span className="flex items-center gap-0.5 rounded-pill bg-canvas px-2 py-0.5 text-[0.6rem] text-ink-muted">
                    <ClockIcon width={11} height={11} />
                    {specialist.nextSlot}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs leading-6 text-ink-muted">{specialist.bio}</p>

            <ul className="flex flex-col gap-1.5 rounded-card bg-canvas p-3">
              {specialist.credentials.map((c) => (
                <li key={c} className="flex items-start gap-2 text-2xs text-ink">
                  <ShieldIcon width={13} height={13} className="mt-0.5 shrink-0 text-primary-600" />
                  {c}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-1.5">
              {specialist.specialties.map((s) => (
                <span key={s} className="app-chip">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {/* Packages */}
          <h2 className="section-title pt-1">انتخاب پکیج</h2>
          <div className="flex flex-col gap-2.5">
            {specialist.packages.map((pkg) => {
              const isSelected = selected?.id === pkg.id;
              return (
                <motion.button
                  key={pkg.id}
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelected(pkg)}
                  className={cx(
                    "relative rounded-card border p-4 text-right transition-colors",
                    isSelected ? "border-primary-600 bg-primary-50" : "border-line bg-surface",
                  )}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 right-4 rounded-pill bg-sky-600 px-2 py-0.5 text-[0.55rem] font-bold text-white">
                      پرطرفدارترین
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-ink">{pkg.title}</p>
                      <p className="mt-0.5 text-2xs text-ink-muted">{pkg.durationLabel}</p>
                    </div>
                    <div className="text-left">
                      {pkg.originalPriceToman && (
                        <p className="text-[0.6rem] text-ink-soft line-through">
                          {faNumber(pkg.originalPriceToman)}
                        </p>
                      )}
                      <p className="text-sm font-extrabold text-primary-700">{faToman(pkg.priceToman)}</p>
                    </div>
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-2xs text-ink-muted">
                        <CheckIcon width={12} height={12} className="shrink-0 text-primary-600" strokeWidth={2.6} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>

          {/* Reviews */}
          <h2 className="section-title pt-1">نظر مراجعین</h2>
          <div className="flex flex-col gap-2.5 pb-4">
            {REVIEWS.map((review) => (
              <Card key={review.name} className="p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink">{review.name}</p>
                  <span className="flex gap-0.5 text-warn-500">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <StarIcon key={i} width={12} height={12} fill="currentColor" />
                    ))}
                  </span>
                </div>
                <p className="mt-1.5 text-2xs leading-5 text-ink-muted">{review.text}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking desk */}
        <div className="sticky bottom-0 border-t border-line bg-surface/95 px-4 pb-[calc(0.85rem+var(--safe-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-[520px] items-center gap-2">
            <Link
              href={`/chat/${chatThread.id}`}
              aria-label="گفتگوی آزمایشی"
              className="tap-target grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-line text-primary-700"
            >
              <ChatIcon width={20} height={20} />
            </Link>
            <button
              type="button"
              disabled={!selected}
              onClick={() => setBookingOpen(true)}
              className={cx("app-btn-primary flex-1", !selected && "opacity-40 shadow-none")}
            >
              {selected ? `رزرو ${selected.title} — ${faToman(selected.priceToman)}` : "یک پکیج انتخاب کنید"}
            </button>
          </div>
        </div>
      </div>

      <Sheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="تأیید رزرو"
        subtitle={`${specialist.name} — ${selected?.title ?? ""}`}
        footer={
          <button type="button" onClick={confirm} className="app-btn-primary w-full">
            پرداخت و شروع همکاری
          </button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-2.5 pb-2">
            <Row label="پکیج" value={selected.title} />
            <Row label="مدت" value={selected.durationLabel} />
            <Row label="اولین پاسخ‌گویی" value={specialist.nextSlot} />
            <Row label="مبلغ قابل پرداخت" value={faToman(selected.priceToman)} emphasis />
            <p className="rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
              پس از پرداخت، گفتگوی اختصاصی با {specialist.name} فعال می‌شود و برنامه اولیه تا ۴۸ ساعت آینده
              برای شما ارسال خواهد شد.
            </p>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0">
      <span className="text-2xs text-ink-muted">{label}</span>
      <span className={cx("text-xs", emphasis ? "font-extrabold text-primary-700" : "font-bold text-ink")}>
        {value}
      </span>
    </div>
  );
}
