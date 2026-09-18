"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Avatar, Card, ProgressBar, Sep } from "@/components/ui/Bits";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, CloseIcon, ShieldIcon, StarIcon } from "@/components/ui/Icons";
import { adminSpecialists, type VerificationState } from "@/lib/mock/admin";
import { cx, faDate, faNumber, faToman } from "@/lib/format";

const VERIFY_META: Record<VerificationState, { label: string; tone: string }> = {
  verified: { label: "تأییدشده", tone: "bg-primary-50 text-primary-700" },
  pending: { label: "در انتظار بررسی", tone: "bg-warn-50 text-warn-600" },
  rejected: { label: "رد شده", tone: "bg-danger-50 text-danger-600" },
};

/** Credential review, capacity, fees and commission — the levers ops actually pull. */
export default function AdminSpecialistsPage() {
  const toast = useToast();
  const [records, setRecords] = useState(adminSpecialists);

  const setVerification = (id: string, verification: VerificationState) => {
    setRecords((rows) => rows.map((r) => (r.id === id ? { ...r, verification } : r)));
    const name = records.find((r) => r.id === id)?.name ?? "";
    toast.success(
      verification === "verified" ? `مدارک ${name} تأیید شد.` : `درخواست ${name} رد شد.`,
    );
  };

  const setCommission = (id: string, commissionPct: number) =>
    setRecords((rows) => rows.map((r) => (r.id === id ? { ...r, commissionPct } : r)));

  const pending = records.filter((r) => r.verification === "pending").length;

  return (
    <AdminShell
      title="مدیریت متخصصین"
      subtitle={`${faNumber(records.length)} متخصص · ${faNumber(pending)} پرونده در انتظار بررسی`}
    >
      <div className="flex flex-col gap-3">
        {records.map((s) => {
          const load = (s.clients / Math.max(1, s.capacity)) * 100;
          return (
            <Card key={s.id} className="p-0">
              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">
                {/* Identity */}
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={s.name} size={48} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-extrabold text-ink">{s.name}</p>
                      <span
                        className={cx(
                          "shrink-0 rounded-pill px-2 py-0.5 text-[0.6rem] font-bold",
                          VERIFY_META[s.verification].tone,
                        )}
                      >
                        {VERIFY_META[s.verification].label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-2xs text-ink-muted">{s.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-2xs text-ink-soft">
                      <ShieldIcon width={11} height={11} />
                      پروانه {s.licenceNo}
                      <Sep />
                      عضو از {faDate(s.joinedAt, true)}
                      {s.rating > 0 && (
                        <>
                          <Sep />
                          <StarIcon width={11} height={11} className="text-warn-500" />
                          {faNumber(s.rating, 1)}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Capacity */}
                <div className="w-full shrink-0 lg:w-48">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-2xs text-ink-muted">ظرفیت مراجع</span>
                    <span className="text-2xs font-extrabold text-ink">
                      {faNumber(s.clients)} / {faNumber(s.capacity)}
                    </span>
                  </div>
                  <ProgressBar
                    value={load}
                    height={6}
                    tone={load >= 95 ? "danger" : load >= 80 ? "warn" : "primary"}
                  />
                  <p className="mt-1 text-[0.6rem] text-ink-soft">
                    {load >= 95 ? "ظرفیت تکمیل" : `${faNumber(100 - load, 0)}٪ ظرفیت آزاد`}
                  </p>
                </div>

                {/* Economics */}
                <div className="grid w-full shrink-0 grid-cols-3 gap-2 lg:w-72">
                  <Figure label="نرخ ویزیت" value={faToman(s.feeToman)} />
                  <Figure label="تسویه" value={`${faNumber(s.payoutToman / 1_000_000, 0)}م تومان`} />
                  <div className="rounded-card border border-line p-2 text-center">
                    <p className="text-[0.58rem] text-ink-muted">کمیسیون</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={s.commissionPct}
                        onChange={(e) => setCommission(s.id, Number(e.target.value))}
                        aria-label={`درصد کمیسیون ${s.name}`}
                        className="w-12 rounded border border-line bg-canvas px-1 py-0.5 text-center text-xs font-extrabold text-ink outline-none focus:border-primary-500"
                      />
                      <span className="text-2xs text-ink-soft">٪</span>
                    </div>
                  </div>
                </div>
              </div>

              {s.verification !== "verified" && (
                <div className="flex items-center gap-2 border-t border-line bg-canvas px-4 py-2.5">
                  <p className="flex-1 text-2xs text-ink-muted">
                    {s.verification === "pending"
                      ? "مدارک هویتی و پروانه اشتغال بارگذاری شده و منتظر بررسی است."
                      : "این پرونده پیش‌تر رد شده است."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVerification(s.id, "rejected")}
                    className="app-btn-ghost px-3 py-1.5 text-2xs"
                  >
                    <CloseIcon width={13} height={13} />
                    رد
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerification(s.id, "verified")}
                    className="app-btn-primary px-3 py-1.5 text-2xs"
                  >
                    <CheckIcon width={13} height={13} />
                    تأیید مدارک
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-2 text-center">
      <p className="text-[0.58rem] text-ink-muted">{label}</p>
      <p className="mt-1 text-2xs font-extrabold text-ink">{value}</p>
    </div>
  );
}
