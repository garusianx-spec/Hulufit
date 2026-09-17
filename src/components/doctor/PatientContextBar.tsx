"use client";

import Link from "next/link";
import { Sep } from "@/components/ui/Bits";
import { ChevronLeft } from "@/components/ui/Icons";
import { adherenceBand } from "@/lib/mock/patients";
import { GOAL_META, bmi, bmiBand } from "@/lib/health/calc";
import { cx, faNumber } from "@/lib/format";
import type { Patient } from "@/types";

/**
 * Context strip shown above a consultation opened from the specialist portal,
 * so the clinician never has to leave the thread to recall the case.
 */
export function PatientContextBar({ patient }: { patient: Patient }) {
  const bmiValue = bmi(patient.currentWeightKg, patient.heightCm);
  const band = bmiBand(bmiValue);
  const adherence = adherenceBand(patient.adherencePct);

  const tone = {
    primary: "text-primary-700",
    sky: "text-sky-700",
    warn: "text-warn-600",
    danger: "text-danger-600",
  };

  return (
    <Link
      href={`/doctor/${patient.id}`}
      className="block border-b border-line bg-primary-50/60 px-4 py-2"
    >
      <div className="mx-auto flex max-w-[520px] items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xs font-extrabold text-ink">
            پرونده {patient.firstName} {patient.lastName}
          </p>
          <p className="mt-0.5 truncate text-[0.6rem] text-ink-muted">
            {GOAL_META[patient.goal].label}
            <Sep />
            <span className={cx("font-bold", tone[band.tone])}>BMI {faNumber(bmiValue, 1)}</span>
            <Sep />
            <span className={cx("font-bold", tone[adherence.tone])}>
              پایبندی {faNumber(patient.adherencePct)}٪
            </span>
            <Sep />
            وزن {faNumber(patient.currentWeightKg, 1)} از {faNumber(patient.targetWeightKg, 1)}
          </p>
        </div>
        <span className="shrink-0 rounded-pill bg-surface px-2 py-1 text-[0.58rem] font-bold text-primary-700">
          مشاهده پرونده
        </span>
        <ChevronLeft width={15} height={15} className="shrink-0 text-ink-soft" />
      </div>
    </Link>
  );
}
