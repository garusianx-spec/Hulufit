"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Bits";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MinusIcon, PlusIcon, ScaleIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { faNumber, toFa } from "@/lib/format";

/** Quick weight logger with a ±0.1 kg stepper inside a bottom sheet. */
export function WeightQuickLog() {
  const { user, weights, dispatch } = useAppStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(user.currentWeightKg);

  const previous = weights.length > 1 ? weights[weights.length - 2].weightKg : user.currentWeightKg;
  const delta = user.currentWeightKg - previous;
  const loggedToday =
    weights.length > 0 &&
    new Date(weights[weights.length - 1].date).toDateString() === new Date().toDateString();

  const save = () => {
    dispatch({ type: "weight/log", weightKg: Number(value.toFixed(1)) });
    setOpen(false);
    toast.success(`وزن ${faNumber(value, 1)} کیلوگرم ثبت شد.`);
  };

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-pill bg-primary-50 text-primary-600">
            <ScaleIcon width={18} height={18} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">وزن امروز</p>
            <p className="text-2xs text-ink-muted">
              {loggedToday ? "امروز ثبت شده" : "هنوز ثبت نشده"}
            </p>
          </div>
          <div className="text-left">
            <p className="text-lg font-extrabold leading-none text-ink">
              {faNumber(user.currentWeightKg, 1)}
              <span className="mr-1 text-2xs font-medium text-ink-soft">kg</span>
            </p>
            {delta !== 0 && (
              <p
                className={`mt-0.5 text-2xs font-bold ${delta < 0 ? "text-primary-700" : "text-warn-600"}`}
              >
                {delta < 0 ? "▼" : "▲"} <span dir="ltr">{faNumber(Math.abs(delta), 1)}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setValue(user.currentWeightKg);
            setOpen(true);
          }}
          className="app-btn-ghost w-full"
        >
          ثبت وزن جدید
        </button>
      </Card>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="ثبت وزن"
        subtitle="وزن را صبح ناشتا و بعد از سرویس بهداشتی اندازه بگیرید."
        footer={
          <button type="button" onClick={save} className="app-btn-primary w-full">
            ذخیره وزن
          </button>
        }
      >
        <div className="flex items-center justify-center gap-5 py-6">
          <button
            type="button"
            aria-label="کم کردن"
            onClick={() => setValue((v) => Math.max(30, Number((v - 0.1).toFixed(1))))}
            className="tap-target grid h-12 w-12 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
          >
            <MinusIcon />
          </button>
          <motion.div key={value} initial={{ scale: 0.94 }} animate={{ scale: 1 }} className="text-center">
            <p className="text-4xl font-extrabold leading-none text-ink">{faNumber(value, 1)}</p>
            <p className="mt-1 text-xs text-ink-muted">کیلوگرم</p>
          </motion.div>
          <button
            type="button"
            aria-label="زیاد کردن"
            onClick={() => setValue((v) => Math.min(250, Number((v + 0.1).toFixed(1))))}
            className="tap-target grid h-12 w-12 place-items-center rounded-pill border border-line text-ink active:bg-canvas"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="mb-2 flex justify-center gap-2">
          {[-1, -0.5, 0.5, 1].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setValue((v) => Number((v + step).toFixed(1)))}
              className="app-chip"
            >
              {step > 0 ? "+" : "−"}
              {toFa(Math.abs(step))}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
