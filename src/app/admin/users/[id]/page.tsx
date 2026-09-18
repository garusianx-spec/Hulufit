"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Avatar, Card, EmptyState, ProgressBar, Sep } from "@/components/ui/Bits";
import { ChatIcon, ProfileIcon } from "@/components/ui/Icons";
import { findAdminUser, paymentsFor } from "@/lib/mock/admin";
import { bmi, bmiBand } from "@/lib/health/calc";
import { cx, faDate, faNumber, faRelative, faToman } from "@/lib/format";

const PAYMENT_TONE = {
  paid: "bg-primary-50 text-primary-700",
  refunded: "bg-slate-100 text-ink-muted",
  pending: "bg-warn-50 text-warn-600",
} as const;

const PAYMENT_LABEL = { paid: "پرداخت‌شده", refunded: "مسترد شده", pending: "در انتظار" } as const;

/** Deep-dive on one client: assessment answers, plan, adherence, payments. */
export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const user = findAdminUser(typeof params?.id === "string" ? params.id : "");

  if (!user) {
    return (
      <AdminShell title="کاربر">
        <EmptyState
          icon={<ProfileIcon width={24} height={24} />}
          title="کاربر یافت نشد"
          action={
            <Link href="/admin/users" className="app-btn-ghost mt-2">
              بازگشت به فهرست
            </Link>
          }
        />
      </AdminShell>
    );
  }

  const payments = paymentsFor(user.id);
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountToman, 0);
  const bmiValue = bmi(user.assessment.weightKg, user.assessment.heightCm);
  const band = bmiBand(bmiValue);

  return (
    <AdminShell
      title={user.name}
      subtitle={`${user.phone} · عضو از ${faDate(user.joinedAt, true)}`}
      actions={
        <Link href="/admin/users" className="app-btn-ghost px-3 py-2 text-xs">
          بازگشت
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Identity + plan */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={56} ring />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
              <p className="mt-0.5 text-2xs text-ink-muted">{user.phone}</p>
              <p className="mt-1 text-2xs text-ink-soft">آخرین فعالیت {faRelative(user.lastSeen)}</p>
            </div>
          </div>

          <dl className="mt-4 flex flex-col gap-2.5 border-t border-line pt-3 text-2xs">
            <Row label="برنامه فعال" value={user.plan} />
            <Row label="متخصص" value={user.specialist} />
            <Row label="مجموع پرداختی" value={faToman(paid)} emphasis />
          </dl>

          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-2xs text-ink-muted">پایبندی ۷ روز اخیر</span>
              <span className="text-2xs font-extrabold text-ink">{faNumber(user.adherencePct)}٪</span>
            </div>
            <ProgressBar
              value={user.adherencePct}
              height={7}
              tone={user.adherencePct >= 80 ? "primary" : user.adherencePct >= 60 ? "warn" : "danger"}
            />
          </div>

          <Link href={`/chat/th_1?patient=pt_1`} className="app-btn-sky mt-4 w-full">
            <ChatIcon width={16} height={16} />
            مشاهده گفتگو
          </Link>
        </Card>

        {/* Assessment answers */}
        <Card className="lg:col-span-2">
          <p className="text-xs font-extrabold text-ink">پاسخ‌های ارزیابی سلامت</p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="سن" value={`${faNumber(user.assessment.age)} سال`} />
            <Metric label="قد" value={`${faNumber(user.assessment.heightCm)} cm`} />
            <Metric label="وزن" value={`${faNumber(user.assessment.weightKg, 1)} kg`} />
            <Metric
              label={`BMI — ${band.label}`}
              value={faNumber(bmiValue, 1)}
              tone={band.tone === "primary" ? "primary" : band.tone === "warn" ? "warn" : "danger"}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Block label="هدف">{user.assessment.goal}</Block>
            <Block label="سطح فعالیت">{user.assessment.activity}</Block>
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            <TagRow label="شرایط پزشکی" items={user.assessment.conditions} tone="warn" />
            <TagRow label="آلرژی و ترجیح غذایی" items={user.assessment.allergies} tone="sky" />
          </div>
        </Card>

        {/* Payment log */}
        <Card className="lg:col-span-3 p-0">
          <p className="border-b border-line p-4 text-xs font-extrabold text-ink">گزارش پرداخت‌ها</p>
          {payments.length === 0 ? (
            <p className="p-6 text-center text-2xs text-ink-soft">پرداختی ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{p.title}</p>
                    <p className="mt-0.5 text-2xs text-ink-muted">
                      {faDate(p.at, true)}
                      <Sep />
                      {p.gateway}
                      <Sep />
                      کد پیگیری {p.refId}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold text-ink">{faToman(p.amountToman)}</span>
                  <span className={cx("shrink-0 rounded-pill px-2 py-0.5 text-[0.6rem] font-bold", PAYMENT_TONE[p.status])}>
                    {PAYMENT_LABEL[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cx(emphasis ? "font-extrabold text-primary-700" : "font-bold text-ink")}>{value}</dd>
    </div>
  );
}

function Metric({ label, value, tone = "ink" }: { label: string; value: string; tone?: string }) {
  const color = { ink: "text-ink", primary: "text-primary-700", warn: "text-warn-600", danger: "text-danger-600" }[tone] ?? "text-ink";
  return (
    <div className="rounded-card border border-line p-3 text-center">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className={cx("mt-1 text-sm font-extrabold", color)}>{value}</p>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-canvas p-3">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-ink">{children}</p>
    </div>
  );
}

function TagRow({ label, items, tone }: { label: string; items: string[]; tone: "warn" | "sky" }) {
  const style = tone === "warn" ? "bg-warn-50 text-warn-600" : "bg-sky-50 text-sky-700";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-2xs text-ink-muted">{label}:</span>
      {items.length === 0 ? (
        <span className="text-2xs text-ink-soft">—</span>
      ) : (
        items.map((item) => (
          <span key={item} className={cx("rounded-pill px-2 py-0.5 text-[0.6rem] font-bold", style)}>
            {item}
          </span>
        ))
      )}
    </div>
  );
}
