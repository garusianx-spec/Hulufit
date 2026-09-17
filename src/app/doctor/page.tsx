"use client";

import { useMemo, useState } from "react";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Card, Chip, EmptyState, Sep } from "@/components/ui/Bits";
import { PatientCard } from "@/components/doctor/PatientCard";
import { CloseIcon, CoachIcon, SearchIcon } from "@/components/ui/Icons";
import { currentSpecialist, patients } from "@/lib/mock/patients";
import { faNumber } from "@/lib/format";

type Filter = "all" | "needsReview" | "lowAdherence" | "unread";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "همه" },
  { key: "needsReview", label: "نیازمند بازبینی" },
  { key: "lowAdherence", label: "پایبندی پایین" },
  { key: "unread", label: "پیام خوانده‌نشده" },
];

/** Doctor View home: the assigned patient roster. */
export default function DoctorRosterPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter === "needsReview" && p.planStatus !== "needsReview") return false;
      if (filter === "lowAdherence" && p.adherencePct >= 60) return false;
      if (filter === "unread" && p.unreadMessages === 0) return false;
      if (!q) return true;
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
    });
  }, [filter, query]);

  const needsReview = patients.filter((p) => p.planStatus === "needsReview").length;
  const unread = patients.reduce((sum, p) => sum + p.unreadMessages, 0);
  const avgAdherence = Math.round(
    patients.reduce((sum, p) => sum + p.adherencePct, 0) / Math.max(1, patients.length),
  );

  return (
    <AppShell header={<AppHeader variant="brand" />}>
      <PullToRefresh onRefresh={async () => new Promise((r) => setTimeout(r, 700))}>
        <div className="flex flex-col gap-3 pt-4">
          {/* Practice summary */}
          <div className="px-4">
            <Card className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">{currentSpecialist.name}</p>
                <p className="mt-0.5 text-2xs text-ink-muted">
                  {currentSpecialist.title}
                  <Sep />
                  نمای متخصص
                </p>
              </div>
              <div className="grid grid-cols-4 divide-x divide-x-reverse divide-line">
                <Metric value={patients.length} label="مراجع فعال" />
                <Metric value={needsReview} label="بازبینی" tone="warn" />
                <Metric value={unread} label="پیام نو" tone="danger" />
                <Metric value={avgAdherence} label="میانگین پایبندی" suffix="٪" tone="primary" />
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="px-4">
            <div className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-2.5">
              <SearchIcon width={18} height={18} className="shrink-0 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی نام مراجع…"
                type="search"
                className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن" className="text-ink-soft">
                  <CloseIcon width={16} height={16} />
                </button>
              )}
            </div>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => (
              <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </Chip>
            ))}
          </div>

          <p className="px-4 text-2xs text-ink-muted">{faNumber(results.length)} مراجع</p>

          <div className="flex flex-col gap-2.5 px-4">
            {results.length === 0 ? (
              <EmptyState
                icon={<CoachIcon width={24} height={24} />}
                title="مراجعی یافت نشد"
                description="فیلتر را تغییر دهید یا نام دیگری جستجو کنید."
              />
            ) : (
              results.map((p) => <PatientCard key={p.id} patient={p} />)
            )}
          </div>
        </div>
        <NavSpacer />
      </PullToRefresh>
    </AppShell>
  );
}

function Metric({
  value,
  label,
  suffix = "",
  tone = "ink",
}: {
  value: number;
  label: string;
  suffix?: string;
  tone?: "ink" | "primary" | "warn" | "danger";
}) {
  const color = {
    ink: "text-ink",
    primary: "text-primary-700",
    warn: "text-warn-600",
    danger: "text-danger-600",
  }[tone];
  return (
    <div className="text-center">
      <p className={`text-base font-extrabold ${color}`}>
        {faNumber(value)}
        {suffix}
      </p>
      <p className="mt-0.5 text-[0.58rem] text-ink-muted">{label}</p>
    </div>
  );
}
