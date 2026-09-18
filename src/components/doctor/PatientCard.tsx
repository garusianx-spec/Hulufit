"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, ProgressBar, Sep } from "@/components/ui/Bits";
import { ChatIcon, ClockIcon } from "@/components/ui/Icons";
import { PLAN_STATUS_META, adherenceBand } from "@/lib/mock/patients";
import { GOAL_META, bmi, bmiBand } from "@/lib/health/calc";
import { cx, faNumber, faRelative } from "@/lib/format";
import type { Patient } from "@/types";

const TONE: Record<"primary" | "warn" | "danger", string> = {
  primary: "bg-primary-50 text-primary-700",
  warn: "bg-warn-50 text-warn-600",
  danger: "bg-danger-50 text-danger-600",
};

/** Roster row: identity, the three status badges, adherence and a chat jump. */
export function PatientCard({ patient }: { patient: Patient }) {
  const adherence = adherenceBand(patient.adherencePct);
  const status = PLAN_STATUS_META[patient.planStatus];
  const bmiValue = bmi(patient.currentWeightKg, patient.heightCm);
  const band = bmiBand(bmiValue);
  const lost = patient.startWeightKg - patient.currentWeightKg;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="app-card overflow-hidden">
        <Link href={`/doctor/${patient.id}`} className="block p-3.5">
          <div className="flex items-start gap-3">
            <div className="relative">
              <Avatar src={patient.avatarUrl} name={`${patient.firstName} ${patient.lastName}`} size={48} />
              {patient.unreadMessages > 0 && (
                <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-pill bg-danger-500 px-1 text-[0.55rem] font-bold text-white ring-2 ring-surface">
                  {faNumber(patient.unreadMessages)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-extrabold text-ink">
                  {patient.firstName} {patient.lastName}
                </p>
                <span className={cx("shrink-0 rounded-pill px-2 py-0.5 text-[0.58rem] font-bold", TONE[status.tone])}>
                  {status.label}
                </span>
              </div>

              <p className="mt-0.5 truncate text-2xs text-ink-muted">
                {faNumber(patient.age)} ساله
                <Sep />
                {GOAL_META[patient.goal].label}
                <Sep />
                <span className="inline-flex items-center gap-1">
                  <ClockIcon width={10} height={10} />
                  {faRelative(patient.lastCheckIn)}
                </span>
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone={band.tone}>
                  BMI {faNumber(bmiValue, 1)} — {band.label}
                </Badge>
                <Badge tone={adherence.tone}>
                  {adherence.label} {faNumber(patient.adherencePct)}٪
                </Badge>
                <Badge tone={lost >= 0 ? "primary" : "warn"}>
                  {lost >= 0 ? "▼" : "▲"} {faNumber(Math.abs(lost), 1)} کیلوگرم
                </Badge>
              </div>

              <div className="mt-2.5">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[0.6rem] text-ink-soft">پایبندی ۷ روز اخیر</span>
                  <span className="text-[0.6rem] font-extrabold text-ink">
                    {faNumber(patient.adherencePct)}٪
                  </span>
                </div>
                <ProgressBar
                  value={patient.adherencePct}
                  tone={adherence.tone === "primary" ? "primary" : adherence.tone === "warn" ? "warn" : "danger"}
                  height={6}
                />
              </div>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 border-t border-line px-3.5 py-2">
          <Link
            href={`/doctor/${patient.id}`}
            className="flex-1 rounded-pill bg-primary-50 py-2 text-center text-2xs font-bold text-primary-700"
          >
            ویرایش برنامه‌ها
          </Link>
          <Link
            href={`/doctor/desk?patient=${patient.id}`}
            aria-label={`گفتگو با ${patient.firstName}`}
            className="tap-target grid h-9 w-9 shrink-0 place-items-center rounded-pill border border-line text-sky-700"
          >
            <ChatIcon width={17} height={17} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "warn" | "danger" | "sky";
}) {
  const style =
    tone === "sky" ? "bg-sky-50 text-sky-700" : TONE[tone as "primary" | "warn" | "danger"];
  return <span className={cx("rounded-pill px-2 py-0.5 text-[0.58rem] font-bold", style)}>{children}</span>;
}
