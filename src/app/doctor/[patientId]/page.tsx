"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar, Card, EmptyState, ProgressBar, Sep } from "@/components/ui/Bits";
import { DietPlanBuilder } from "@/components/doctor/DietPlanBuilder";
import { WorkoutPlanBuilder } from "@/components/doctor/WorkoutPlanBuilder";
import { SupplementScheduler } from "@/components/doctor/SupplementScheduler";
import { ChatIcon, ClockIcon, CoachIcon, ShieldIcon } from "@/components/ui/Icons";
import { PLAN_STATUS_META, adherenceBand, findPatient } from "@/lib/mock/patients";
import {
  ACTIVITY_META,
  ALLERGY_LABELS,
  CONDITION_LABELS,
  GOAL_META,
  bmi,
  bmiBand,
  needsClinicalReview,
} from "@/lib/health/calc";
import { cx, faNumber, faRelative } from "@/lib/format";

type BuilderTab = "diet" | "workout" | "supplements";

const TABS: Array<{ key: BuilderTab; label: string; icon: string }> = [
  { key: "diet", label: "رژیم غذایی", icon: "🥗" },
  { key: "workout", label: "تمرین", icon: "🏋️" },
  { key: "supplements", label: "مکمل و دارو", icon: "💊" },
];

const TONE: Record<"primary" | "warn" | "danger" | "sky", string> = {
  primary: "bg-primary-50 text-primary-700",
  warn: "bg-warn-50 text-warn-600",
  danger: "bg-danger-50 text-danger-600",
  sky: "bg-sky-50 text-sky-700",
};

/** Patient workspace: context header, the three builders, and the chat bridge. */
export default function PatientWorkspacePage() {
  const params = useParams<{ patientId: string }>();
  const patient = findPatient(typeof params?.patientId === "string" ? params.patientId : "");

  const [tab, setTab] = useState<BuilderTab>("diet");
  const [direction, setDirection] = useState(0);

  if (!patient) {
    return (
      <AppShell header={<AppHeader variant="page" title="مراجع" backHref="/doctor" />}>
        <EmptyState
          icon={<CoachIcon width={24} height={24} />}
          title="این مراجع در دسترس نیست"
          action={
            <Link href="/doctor" className="app-btn-ghost mt-2">
              بازگشت به فهرست
            </Link>
          }
        />
      </AppShell>
    );
  }

  const bmiValue = bmi(patient.currentWeightKg, patient.heightCm);
  const band = bmiBand(bmiValue);
  const adherence = adherenceBand(patient.adherencePct);
  const status = PLAN_STATUS_META[patient.planStatus];
  const supervised = needsClinicalReview(patient.conditions);
  const lost = patient.startWeightKg - patient.currentWeightKg;

  const change = (next: BuilderTab) => {
    setDirection(TABS.findIndex((t) => t.key === next) > TABS.findIndex((t) => t.key === tab) ? 1 : -1);
    setTab(next);
  };

  return (
    <AppShell
      header={
        <AppHeader
          variant="page"
          title={`${patient.firstName} ${patient.lastName}`}
          subtitle={`${faNumber(patient.age)} ساله · ${GOAL_META[patient.goal].label}`}
          backHref="/doctor"
        />
      }
    >
      <div className="scroll-pane flex-1">
        <div className="flex flex-col gap-3 px-4 pt-4">
          {/* Patient context */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Avatar
                src={patient.avatarUrl}
                name={`${patient.firstName} ${patient.lastName}`}
                size={52}
                ring
              />
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
                  {ACTIVITY_META[patient.activity].label}
                  <Sep />
                  عضو از {faRelative(patient.joinedAt)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-2xs text-ink-muted">
                  <ClockIcon width={11} height={11} />
                  آخرین ثبت: {faRelative(patient.lastCheckIn)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 divide-x divide-x-reverse divide-line">
              <Metric value={faNumber(patient.currentWeightKg, 1)} label="وزن فعلی" />
              <Metric value={faNumber(patient.targetWeightKg, 1)} label="هدف" tone="sky" />
              <Metric value={faNumber(bmiValue, 1)} label={band.label} tone={band.tone} />
              <Metric
                value={`${lost >= 0 ? "▼" : "▲"} ${faNumber(Math.abs(lost), 1)}`}
                label="تغییر وزن"
                tone={lost >= 0 ? "primary" : "warn"}
              />
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-2xs text-ink-muted">{adherence.label}</span>
                <span className="text-2xs font-extrabold text-ink">
                  {faNumber(patient.adherencePct)}٪
                </span>
              </div>
              <ProgressBar
                value={patient.adherencePct}
                tone={adherence.tone === "primary" ? "primary" : adherence.tone === "warn" ? "warn" : "danger"}
                height={7}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {patient.conditions
                .filter((c) => c !== "none")
                .map((c) => (
                  <span key={c} className={cx("rounded-pill px-2 py-0.5 text-[0.58rem] font-bold", TONE.warn)}>
                    {CONDITION_LABELS[c]}
                  </span>
                ))}
              {patient.allergies
                .filter((a) => a !== "none")
                .map((a) => (
                  <span key={a} className={cx("rounded-pill px-2 py-0.5 text-[0.58rem] font-bold", TONE.sky)}>
                    {ALLERGY_LABELS[a]}
                  </span>
                ))}
            </div>

            {supervised && (
              <p className="flex items-start gap-1.5 rounded-card border border-warn-100 bg-warn-50 px-3 py-2.5 text-2xs leading-5 text-warn-600">
                <ShieldIcon width={13} height={13} className="mt-0.5 shrink-0" />
                این مراجع شرایط بالینی دارد — تغییرات برنامه باید با پزشک معالج هماهنگ شود.
              </p>
            )}

            {/* Bridge into the consultation, patient context pre-loaded */}
            <Link
              href={`/doctor/desk?patient=${patient.id}`}
              className="app-btn-sky w-full"
            >
              <ChatIcon width={17} height={17} />
              گفتگو با {patient.firstName}
              {patient.unreadMessages > 0 && (
                <span className="rounded-pill bg-white/25 px-1.5 py-0.5 text-[0.58rem] font-bold">
                  {faNumber(patient.unreadMessages)} پیام نو
                </span>
              )}
            </Link>
          </Card>

          {/* Builder tabs */}
          <div
            role="tablist"
            aria-label="برنامه‌ساز"
            className="flex gap-1 rounded-pill border border-line bg-canvas p-1"
          >
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => change(t.key)}
                  className="relative flex-1 rounded-pill px-2 py-2 text-xs font-bold transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="builder-tab-pill"
                      className="absolute inset-0 rounded-pill bg-surface shadow-card"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    className={cx(
                      "relative flex items-center justify-center gap-1.5",
                      active ? "text-primary-700" : "text-ink-muted",
                    )}
                  >
                    <span aria-hidden="true">{t.icon}</span>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              /* RTL: a later tab enters from the left. */
              initial={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "diet" && <DietPlanBuilder patient={patient} />}
              {tab === "workout" && <WorkoutPlanBuilder patient={patient} />}
              {tab === "supplements" && <SupplementScheduler patient={patient} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <NavSpacer />
      </div>
    </AppShell>
  );
}

function Metric({
  value,
  label,
  tone = "ink",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "ink" | "primary" | "sky" | "warn" | "danger";
}) {
  const color = {
    ink: "text-ink",
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
    danger: "text-danger-600",
  }[tone];
  return (
    <div className="text-center">
      <p className={cx("text-sm font-extrabold", color)}>{value}</p>
      <p className="mt-0.5 text-[0.58rem] text-ink-muted">{label}</p>
    </div>
  );
}
