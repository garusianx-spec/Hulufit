"use client";

import { useMemo, useState } from "react";
import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Chip, EmptyState } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { SpecialistCard } from "@/components/specialists/SpecialistCard";
import { CloseIcon, CoachIcon, SearchIcon, SettingsIcon } from "@/components/ui/Icons";
import { SPECIALIST_KIND_LABEL, SPECIALTY_FILTERS, specialists } from "@/lib/mock/specialists";
import { cx, faNumber, faToman } from "@/lib/format";
import type { SpecialistKind } from "@/types";

type SortKey = "rating" | "priceAsc" | "reviews";

const PRICE_BANDS = [
  { key: "all", label: "همه", max: Infinity },
  { key: "u1", label: "تا ۱ میلیون", max: 1_000_000 },
  { key: "u2", label: "تا ۲ میلیون", max: 2_000_000 },
  { key: "u4", label: "تا ۴ میلیون", max: 4_000_000 },
] as const;

export default function SpecialistsPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SpecialistKind | "all">("all");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [priceBand, setPriceBand] = useState<(typeof PRICE_BANDS)[number]["key"]>("all");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>("rating");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const band = PRICE_BANDS.find((b) => b.key === priceBand)!;

    const filtered = specialists.filter((s) => {
      if (kind !== "all" && s.kind !== kind) return false;
      if (specialty && !s.specialties.includes(specialty)) return false;
      if (s.startingPriceToman > band.max) return false;
      if (s.rating < minRating) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.specialties.some((x) => x.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === "priceAsc") return a.startingPriceToman - b.startingPriceToman;
      if (sort === "reviews") return b.reviewsCount - a.reviewsCount;
      return b.rating - a.rating;
    });
  }, [kind, minRating, priceBand, query, sort, specialty]);

  const activeFilters =
    (kind !== "all" ? 1 : 0) + (specialty ? 1 : 0) + (priceBand !== "all" ? 1 : 0) + (minRating > 0 ? 1 : 0);

  const reset = () => {
    setKind("all");
    setSpecialty(null);
    setPriceBand("all");
    setMinRating(0);
    setSort("rating");
  };

  return (
    <AppShell
      header={
        <AppHeader
          variant="page"
          title="مشاورین"
          subtitle="متخصصین تغذیه و مربیان تأییدشده"
          backHref="/"
          actions={
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="فیلترها"
              className="tap-target relative grid place-items-center rounded-pill p-2 text-ink active:bg-canvas"
            >
              <SettingsIcon width={20} height={20} />
              {activeFilters > 0 && (
                <span className="absolute left-1 top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-primary-600 px-1 text-[0.55rem] font-bold text-white">
                  {faNumber(activeFilters)}
                </span>
              )}
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={async () => new Promise((r) => setTimeout(r, 700))}>
        <div className="flex flex-col gap-3 pt-3">
          <div className="px-4">
            <div className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-2.5">
              <SearchIcon width={18} height={18} className="shrink-0 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="نام متخصص یا تخصص…"
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
            <Chip active={kind === "all"} onClick={() => setKind("all")}>
              همه
            </Chip>
            {(Object.keys(SPECIALIST_KIND_LABEL) as SpecialistKind[]).map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {SPECIALIST_KIND_LABEL[k]}
              </Chip>
            ))}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            {SPECIALTY_FILTERS.map((s) => (
              <Chip key={s} active={specialty === s} onClick={() => setSpecialty(specialty === s ? null : s)}>
                {s}
              </Chip>
            ))}
          </div>

          <p className="px-4 text-2xs text-ink-muted">{faNumber(results.length)} متخصص یافت شد</p>

          <div className="flex flex-col gap-2.5 px-4">
            {results.length === 0 ? (
              <EmptyState
                icon={<CoachIcon width={24} height={24} />}
                title="نتیجه‌ای یافت نشد"
                description="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
                action={
                  <button type="button" onClick={reset} className="app-btn-ghost mt-2">
                    حذف فیلترها
                  </button>
                }
              />
            ) : (
              results.map((s) => <SpecialistCard key={s.id} specialist={s} />)
            )}
          </div>
        </div>
        <NavSpacer />
      </PullToRefresh>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="فیلتر و مرتب‌سازی"
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="app-btn-ghost flex-1">
              حذف همه
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="app-btn-primary flex-[2]">
              نمایش {faNumber(results.length)} نتیجه
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <FilterGroup title="محدوده قیمت">
            <div className="flex flex-wrap gap-2">
              {PRICE_BANDS.map((band) => (
                <Chip key={band.key} active={priceBand === band.key} onClick={() => setPriceBand(band.key)}>
                  {band.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="حداقل امتیاز کاربران">
            <div className="flex flex-wrap gap-2">
              {[0, 4, 4.5, 4.8].map((r) => (
                <Chip key={r} active={minRating === r} onClick={() => setMinRating(r)}>
                  {r === 0 ? "همه" : `${faNumber(r, 1)} به بالا`}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="مرتب‌سازی">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "rating", label: "بیشترین امتیاز" },
                  { key: "reviews", label: "بیشترین نظر" },
                  { key: "priceAsc", label: "ارزان‌ترین" },
                ] as Array<{ key: SortKey; label: string }>
              ).map((option) => (
                <Chip key={option.key} active={sort === option.key} onClick={() => setSort(option.key)}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <p className="rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
            ارزان‌ترین پکیج فعال در حال حاضر:{" "}
            <span className="font-bold text-ink">
              {faToman(Math.min(...specialists.map((s) => s.startingPriceToman)))}
            </span>
          </p>
        </div>
      </Sheet>
    </AppShell>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cx("flex flex-col gap-2")}>
      <p className="text-xs font-extrabold text-ink">{title}</p>
      {children}
    </div>
  );
}
