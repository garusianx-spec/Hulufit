"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Avatar, Card, Chip, ProgressBar, Sep } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import {
  ChevronRight,
  FileIcon,
  LabIcon,
  PillIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/ui/Icons";
import { adherenceBand, patients, PLAN_STATUS_META } from "@/lib/mock/patients";
import { SUPPLEMENT_LIBRARY } from "@/lib/mock/library";
import {
  ACTIVITY_META,
  ALLERGY_LABELS,
  CONDITION_LABELS,
  GOAL_META,
  bmi,
  bmiBand,
  needsClinicalReview,
} from "@/lib/health/calc";
import { useAppStore } from "@/lib/store/AppStore";
import { cx, faDate, faFileSize, faNumber, faRelative } from "@/lib/format";
import type { Patient } from "@/types";

/** Previously exchanged documents, surfaced beside the thread. */
const PRIOR_ATTACHMENTS: Record<string, Array<{ name: string; kind: "lab" | "pdf"; bytes: number; at: string }>> = {
  pt_1: [
    { name: "آزمایش-خون-مهر-۱۴۰۵.pdf", kind: "lab", bytes: 5_872_640, at: "2026-09-12T09:00:00Z" },
    { name: "برنامه-غذایی-هفته-ششم.pdf", kind: "pdf", bytes: 2_411_724, at: "2026-09-10T09:00:00Z" },
  ],
  pt_2: [
    { name: "آزمایش-قند-و-چربی.pdf", kind: "lab", bytes: 3_104_882, at: "2026-08-28T09:00:00Z" },
    { name: "سونوگرافی-کبد.pdf", kind: "lab", bytes: 7_240_110, at: "2026-08-14T09:00:00Z" },
  ],
  pt_5: [{ name: "آزمایش-هورمونی.pdf", kind: "lab", bytes: 4_002_310, at: "2026-07-30T09:00:00Z" }],
};

/**
 * Consultation desk — the clinician's split view.
 *
 * Roster · live thread · patient context, side by side on a wide screen. On a
 * phone the three panes become a single column with a roster drawer, because a
 * three-pane layout at 412px is unusable.
 */
export function ConsultationDesk({ initialPatientId }: { initialPatientId?: string }) {
  const toast = useToast();
  const { dispatch } = useAppStore();

  const [selectedId, setSelectedId] = useState(initialPatientId ?? patients[0]!.id);
  const [query, setQuery] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);

  const patient = patients.find((p) => p.id === selectedId) ?? patients[0]!;

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) =>
      q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true,
    );
  }, [query]);

  const select = (id: string) => {
    setSelectedId(id);
    setRosterOpen(false);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      {/* ── Roster (wide screens) ─────────────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-line bg-surface xl:flex">
        <div className="border-b border-line p-3">
          <Link href="/doctor" className="mb-2 flex items-center gap-1 text-2xs font-bold text-ink-muted">
            <ChevronRight width={14} height={14} />
            بازگشت به بیماران
          </Link>
          <div className="flex items-center gap-2 rounded-pill border border-line bg-canvas px-3 py-2">
            <SearchIcon width={15} height={15} className="shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی مراجع…"
              type="search"
              className="w-full bg-transparent text-2xs text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
        </div>
        <RosterList rows={roster} selectedId={selectedId} onSelect={select} />
      </aside>

      {/* ── Thread ────────────────────────────────────────────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* The roster drawer trigger only exists where the sidebar is hidden. */}
        <button
          type="button"
          onClick={() => setRosterOpen(true)}
          className="absolute left-3 top-[calc(var(--safe-top)+0.85rem)] z-40 rounded-pill border border-line bg-surface px-3 py-1.5 text-2xs font-bold text-ink shadow-card xl:hidden"
        >
          فهرست مراجعین
        </button>

        <ChatScreen key={patient.id} threadId={patient.threadId} patientId={patient.id} clinicianView />
      </div>

      {/* ── Clinical context ──────────────────────────────────────────── */}
      <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface lg:flex">
        <PatientContext
          patient={patient}
          onPrescribe={() => setPrescribeOpen(true)}
        />
      </aside>

      {/* ── Mobile roster drawer ──────────────────────────────────────── */}
      <Sheet open={rosterOpen} onClose={() => setRosterOpen(false)} title="مراجعین" maxHeight="85vh">
        <div className="pb-2">
          <div className="mb-2 flex items-center gap-2 rounded-pill border border-line bg-canvas px-3 py-2">
            <SearchIcon width={15} height={15} className="shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی مراجع…"
              type="search"
              className="w-full bg-transparent text-2xs text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          <RosterList rows={roster} selectedId={selectedId} onSelect={select} />
        </div>
      </Sheet>

      {/* ── Quick prescribe ───────────────────────────────────────────── */}
      <Sheet
        open={prescribeOpen}
        onClose={() => setPrescribeOpen(false)}
        title="تجویز سریع"
        subtitle={`افزودن مستقیم به تایم‌لاین ${patient.firstName}`}
        maxHeight="85vh"
      >
        <ul className="flex flex-col gap-2 pb-2">
          {SUPPLEMENT_LIBRARY.slice(0, 6).map((preset) => (
            <li key={preset.name}>
              <button
                type="button"
                aria-label={`تجویز ${preset.name}`}
                onClick={() => {
                  dispatch({
                    type: "doctor/publishSupplements",
                    draft: {
                      patientId: patient.id,
                      items: [{ ...preset, id: `rx_${Date.now()}` }],
                      updatedAt: new Date().toISOString(),
                    },
                  });
                  setPrescribeOpen(false);
                  toast.success(`«${preset.name}» به تایم‌لاین ${patient.firstName} اضافه شد.`);
                }}
                className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface p-3 text-right active:bg-canvas"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary-50 text-primary-700">
                  <PillIcon width={17} height={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink">{preset.name}</span>
                  <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                    {preset.dosage}
                    <Sep />
                    {preset.timeLabel}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/* ------------------------------- roster --------------------------------- */

function RosterList({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Patient[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex-1 overflow-y-auto">
      {rows.map((p) => {
        const active = p.id === selectedId;
        const adherence = adherenceBand(p.adherencePct);
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              aria-current={active ? "true" : undefined}
              className={cx(
                "relative flex w-full items-center gap-2.5 border-b border-line p-3 text-right transition-colors",
                active ? "bg-primary-50" : "hover:bg-canvas",
              )}
            >
              {active && (
                <motion.span
                  layoutId="desk-roster"
                  className="absolute inset-y-0 right-0 w-1 bg-primary-600"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Avatar name={`${p.firstName} ${p.lastName}`} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-2xs font-extrabold text-ink">
                    {p.firstName} {p.lastName}
                  </span>
                  {p.unreadMessages > 0 && (
                    <span className="shrink-0 rounded-pill bg-danger-500 px-1.5 text-[0.55rem] font-bold text-white">
                      {faNumber(p.unreadMessages)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[0.6rem] text-ink-muted">
                  {GOAL_META[p.goal].label}
                  <Sep />
                  <span
                    className={cx(
                      "font-bold",
                      adherence.tone === "primary"
                        ? "text-primary-700"
                        : adherence.tone === "warn"
                          ? "text-warn-600"
                          : "text-danger-600",
                    )}
                  >
                    {faNumber(p.adherencePct)}٪
                  </span>
                  <Sep />
                  {faRelative(p.lastCheckIn)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------- clinical context ---------------------------- */

function PatientContext({ patient, onPrescribe }: { patient: Patient; onPrescribe: () => void }) {
  const bmiValue = bmi(patient.currentWeightKg, patient.heightCm);
  const band = bmiBand(bmiValue);
  const adherence = adherenceBand(patient.adherencePct);
  const status = PLAN_STATUS_META[patient.planStatus];
  const supervised = needsClinicalReview(patient.conditions);
  const files = PRIOR_ATTACHMENTS[patient.id] ?? [];
  const lost = patient.startWeightKg - patient.currentWeightKg;

  return (
    <div className="flex flex-col gap-3 p-3">
      <Card className="p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={`${patient.firstName} ${patient.lastName}`} size={44} ring />
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-ink">
              {patient.firstName} {patient.lastName}
            </p>
            <p className="mt-0.5 truncate text-2xs text-ink-muted">
              {faNumber(patient.age)} ساله
              <Sep />
              {ACTIVITY_META[patient.activity].label}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label="وزن فعلی" value={`${faNumber(patient.currentWeightKg, 1)} kg`} />
          <Metric label="هدف" value={`${faNumber(patient.targetWeightKg, 1)} kg`} tone="sky" />
          <Metric label={band.label} value={`BMI ${faNumber(bmiValue, 1)}`} tone={band.tone} />
          <Metric
            label="تغییر وزن"
            value={`${lost >= 0 ? "▼" : "▲"} ${faNumber(Math.abs(lost), 1)}`}
            tone={lost >= 0 ? "primary" : "warn"}
          />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-2xs text-ink-muted">{adherence.label}</span>
            <span className="text-2xs font-extrabold text-ink">{faNumber(patient.adherencePct)}٪</span>
          </div>
          <ProgressBar
            value={patient.adherencePct}
            height={6}
            tone={adherence.tone === "primary" ? "primary" : adherence.tone === "warn" ? "warn" : "danger"}
          />
        </div>

        <span
          className={cx(
            "mt-3 inline-block rounded-pill px-2 py-0.5 text-[0.6rem] font-bold",
            status.tone === "primary"
              ? "bg-primary-50 text-primary-700"
              : status.tone === "warn"
                ? "bg-warn-50 text-warn-600"
                : "bg-danger-50 text-danger-600",
          )}
        >
          {status.label}
        </span>
      </Card>

      {/* Medical history */}
      <Card className="p-3">
        <p className="text-2xs font-extrabold text-ink">سابقه پزشکی</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {patient.conditions.filter((c) => c !== "none").length === 0 && (
            <span className="text-2xs text-ink-soft">موردی ثبت نشده</span>
          )}
          {patient.conditions
            .filter((c) => c !== "none")
            .map((c) => (
              <Chip key={c} className="border-warn-100 bg-warn-50 text-warn-600">
                {CONDITION_LABELS[c]}
              </Chip>
            ))}
          {patient.allergies
            .filter((a) => a !== "none")
            .map((a) => (
              <Chip key={a} className="border-sky-200 bg-sky-50 text-sky-700">
                {ALLERGY_LABELS[a]}
              </Chip>
            ))}
        </div>
        {supervised && (
          <p className="mt-2 flex items-start gap-1.5 rounded-card border border-warn-100 bg-warn-50 px-2.5 py-2 text-[0.6rem] leading-5 text-warn-600">
            <ShieldIcon width={12} height={12} className="mt-0.5 shrink-0" />
            نیازمند هماهنگی با پزشک معالج پیش از تغییر برنامه.
          </p>
        )}
      </Card>

      {/* Prior documents */}
      <Card className="p-3">
        <p className="text-2xs font-extrabold text-ink">آزمایش‌ها و اسناد قبلی</p>
        {files.length === 0 ? (
          <p className="mt-2 text-2xs text-ink-soft">سندی بارگذاری نشده است.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-card border border-line p-2 text-right transition-colors hover:bg-canvas"
                >
                  <span
                    className={cx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-card",
                      f.kind === "lab" ? "bg-sky-50 text-sky-600" : "bg-danger-50 text-danger-600",
                    )}
                  >
                    {f.kind === "lab" ? <LabIcon width={15} height={15} /> : <FileIcon width={15} height={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.6rem] font-bold text-ink">{f.name}</span>
                    <span className="mt-0.5 block text-[0.58rem] text-ink-muted">
                      {faFileSize(f.bytes)}
                      <Sep />
                      {faDate(f.at, true)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Quick actions */}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onPrescribe} className="app-btn-primary w-full py-2 text-xs">
          <PillIcon width={15} height={15} />
          تجویز سریع مکمل
        </button>
        <Link href={`/doctor/${patient.id}`} className="app-btn-ghost w-full py-2 text-xs">
          ویرایش برنامه‌ها
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "ink" }: { label: string; value: string; tone?: string }) {
  const color =
    { ink: "text-ink", primary: "text-primary-700", sky: "text-sky-700", warn: "text-warn-600", danger: "text-danger-600" }[
      tone
    ] ?? "text-ink";
  return (
    <div className="rounded-card border border-line p-2 text-center">
      <p className="text-[0.58rem] text-ink-muted">{label}</p>
      <p className={cx("mt-0.5 text-2xs font-extrabold", color)}>{value}</p>
    </div>
  );
}
