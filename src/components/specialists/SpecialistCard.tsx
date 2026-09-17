"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Bits";
import { StarIcon } from "@/components/ui/Icons";
import { SPECIALIST_KIND_LABEL } from "@/lib/mock/specialists";
import { faNumber, faToman } from "@/lib/format";
import type { Specialist } from "@/types";

export function SpecialistCard({ specialist }: { specialist: Specialist }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Link href={`/specialists/${specialist.id}`} className="app-card block p-3.5">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar src={specialist.avatarUrl} name={specialist.name} size={52} />
            {specialist.online && (
              <span className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full bg-primary-500 ring-2 ring-surface" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-extrabold text-ink">{specialist.name}</p>
              <span className="flex shrink-0 items-center gap-0.5 rounded-pill bg-warn-50 px-1.5 py-0.5 text-[0.6rem] font-extrabold text-warn-600">
                <StarIcon width={11} height={11} fill="currentColor" />
                {faNumber(specialist.rating, 1)}
              </span>
            </div>

            <p className="mt-0.5 truncate text-2xs text-ink-muted">{specialist.title}</p>

            <div className="mt-2 flex flex-wrap gap-1">
              <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-[0.58rem] font-bold text-primary-700">
                {SPECIALIST_KIND_LABEL[specialist.kind]}
              </span>
              {specialist.specialties.slice(0, 2).map((s) => (
                <span key={s} className="rounded-pill bg-canvas px-2 py-0.5 text-[0.58rem] text-ink-muted">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5">
          <Metric value={`${faNumber(specialist.reviewsCount)}`} label="نظر" />
          <Metric value={`${faNumber(specialist.clientsCount)}`} label="مراجع" />
          <Metric value={`${faNumber(specialist.yearsExperience)} سال`} label="سابقه" />
          <div className="mr-auto text-left">
            <p className="text-2xs text-ink-soft">شروع از</p>
            <p className="text-xs font-extrabold text-primary-700">
              {faToman(specialist.startingPriceToman)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-2xs font-extrabold text-ink">{value}</span>
      <span className="text-[0.55rem] text-ink-soft">{label}</span>
    </span>
  );
}
