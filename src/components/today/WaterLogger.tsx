"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Bits";
import { DropIcon, MinusIcon, PlusIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { clamp, faNumber } from "@/lib/format";
import { waterLogSteps } from "@/lib/mock/user";

/** Quick water logger — tap a preset or nudge with ±. */
export function WaterLogger() {
  const { today, user, dispatch } = useAppStore();
  const pct = clamp((today.waterMl / user.dailyWaterTargetMl) * 100, 0, 100);
  const glasses = Math.round(user.dailyWaterTargetMl / 250);
  const filled = Math.round(today.waterMl / 250);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-sky-50 text-sky-600">
          <DropIcon width={18} height={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">آب امروز</p>
          <p className="text-2xs text-ink-muted">
            {faNumber(today.waterMl)} از {faNumber(user.dailyWaterTargetMl)} میلی‌لیتر
          </p>
        </div>
        <p className="text-sm font-extrabold text-sky-700">{faNumber(pct)}٪</p>
      </div>

      <div className="flex items-end gap-1.5" role="img" aria-label={`${faNumber(filled)} لیوان از ${faNumber(glasses)}`}>
        {Array.from({ length: glasses }).map((_, i) => (
          <motion.span
            key={i}
            className="h-7 flex-1 rounded-md border"
            initial={false}
            animate={{
              backgroundColor: i < filled ? "#38BDF8" : "#F1F5F9",
              borderColor: i < filled ? "#0284C7" : "#E2E8F0",
            }}
            transition={{ duration: 0.2, delay: i * 0.01 }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="کاهش"
          onClick={() => dispatch({ type: "water/add", ml: -250 })}
          className="tap-target grid h-9 w-9 place-items-center rounded-pill border border-line text-ink-muted active:bg-canvas"
        >
          <MinusIcon width={18} height={18} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {waterLogSteps.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => dispatch({ type: "water/add", ml })}
              className="flex-1 rounded-pill border border-sky-200 bg-sky-50 py-2 text-2xs font-bold text-sky-700 transition-transform active:scale-95"
            >
              <span dir="ltr">+{faNumber(ml)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="افزایش"
          onClick={() => dispatch({ type: "water/add", ml: 250 })}
          className="tap-target grid h-9 w-9 place-items-center rounded-pill bg-sky-600 text-white active:scale-95"
        >
          <PlusIcon width={18} height={18} />
        </button>
      </div>
    </Card>
  );
}
