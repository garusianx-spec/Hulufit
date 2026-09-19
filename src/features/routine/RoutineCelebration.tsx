"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Confetti } from "@/components/ui/Confetti";
import { CheckMorph } from "@/components/ui/CheckMorph";
import { useAppStore } from "@/lib/store/AppStore";
import { faNumber } from "@/lib/format";
import { useRoutineCelebration } from "./useRoutineCelebration";

/**
 * The reward for finishing a day.
 *
 * Meals, training and supplements all at 100% is the routine — water is left
 * out on purpose, because it keeps climbing after the plan is done and would
 * make the moment arrive at an arbitrary sip.
 */
export function RoutineCelebration() {
  const reduced = useReducedMotion();
  const { compliance, today } = useAppStore();

  const complete =
    compliance.meals >= 100 && compliance.workout >= 100 && compliance.supplements >= 100;
  const day = today.date.slice(0, 10);
  const { celebrating, dismiss } = useRoutineCelebration(complete, day);

  return (
    <>
      <Confetti fire={celebrating} />
      <AnimatePresence>
        {celebrating && (
          <motion.button
            type="button"
            onClick={dismiss}
            aria-live="polite"
            className="fixed inset-x-4 bottom-[calc(var(--nav-h)+var(--safe-bottom)+1rem)] z-[61] mx-auto flex max-w-[480px] items-center gap-3 rounded-card border border-primary-200 bg-primary-50 p-4 text-right shadow-card"
            initial={{ opacity: 0, y: 24, scale: reduced ? 1 : 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 28 }}
          >
            <CheckMorph done size={34} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-primary-800">
                روتین امروز کامل شد 🎉
              </span>
              <span className="mt-0.5 block text-2xs text-primary-700">
                پایبندی امروز {faNumber(compliance.overall)}٪
                {" — "}
                همین ثبات است که نتیجه می‌دهد.
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
