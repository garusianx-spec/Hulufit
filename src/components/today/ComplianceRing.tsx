"use client";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ProgressRing } from "@/components/ui/ProgressRing";

interface Props {
  overall: number;
  meals: number;
  workout: number;
  water: number;
}

const LEGEND = [
  { key: "meals", label: "تغذیه", color: "#059669" },
  { key: "workout", label: "تمرین", color: "#0284C7" },
  { key: "water", label: "آب", color: "#38BDF8" },
] as const;

/** Interactive daily compliance ring — three concentric metrics. */
export function ComplianceRing({ overall, meals, workout, water }: Props) {
  return (
    <div className="flex items-center gap-4">
      <ProgressRing
        size={148}
        thickness={11}
        segments={[
          { value: meals, color: "#059669" },
          { value: workout, color: "#0284C7" },
          { value: water, color: "#38BDF8" },
        ]}
      >
        <div>
          <p className="text-2xl font-extrabold leading-none text-ink">
            <AnimatedNumber value={overall} />
            <span className="text-sm font-bold text-ink-muted">٪</span>
          </p>
          <p className="mt-1 text-2xs text-ink-muted">پایبندی امروز</p>
        </div>
      </ProgressRing>

      <ul className="flex flex-1 flex-col gap-2.5">
        {LEGEND.map((item) => {
          const value = item.key === "meals" ? meals : item.key === "workout" ? workout : water;
          return (
            <li key={item.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="flex-1 text-xs text-ink-muted">{item.label}</span>
              <span className="text-xs font-extrabold text-ink">
                <AnimatedNumber value={value} />٪
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
