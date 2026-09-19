"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { faDuration, toFa } from "@/lib/format";
import { ChevronRight } from "@/components/ui/Icons";
import { OtpInput } from "./OtpInput";
import { maskForDisplay } from "../lib/phone";

export const OTP_LENGTH = 5;

/**
 * Step two: the code.
 *
 * The countdown is the code's own lifetime, so what the screen says and what
 * the gateway will accept are the same number. When it reaches zero the only
 * thing on offer is a fresh code.
 */
export function CodeStep({
  msisdn,
  remaining,
  busy,
  error,
  attemptsLeft,
  devCode,
  onVerify,
  onResend,
  onBack,
}: {
  msisdn: string;
  remaining: number;
  busy: boolean;
  error: string | null;
  attemptsLeft: number | null;
  devCode?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const expired = remaining <= 0;

  // A rejected code clears itself, so the next attempt starts from an empty row.
  useEffect(() => {
    if (error) setCode("");
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <p className="text-sm text-ink-muted">کد ۵ رقمی ارسال‌شده به شماره زیر را وارد کنید</p>
        <p dir="ltr" className="text-base font-extrabold tabular-nums text-ink">
          {maskForDisplay(msisdn)}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-primary-700"
        >
          <ChevronRight className="size-4" />
          ویرایش شماره
        </button>
      </div>

      <OtpInput
        value={code}
        length={OTP_LENGTH}
        onChange={setCode}
        onComplete={onVerify}
        disabled={busy || expired}
        invalid={Boolean(error)}
      />

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs font-medium text-danger-600"
        >
          {error}
          {attemptsLeft !== null && ` (${toFa(attemptsLeft)} تلاش باقی مانده)`}
        </motion.p>
      )}

      {devCode && (
        <p className="rounded-xl border border-warn-500/40 bg-warn-50 px-3 py-2 text-center text-xs font-bold text-warn-600">
          حالت نمایشی — کد شما: <span dir="ltr">{toFa(devCode)}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => onVerify(code)}
        disabled={busy || expired || code.length < OTP_LENGTH}
        className="app-btn-primary w-full py-3.5 text-base disabled:opacity-45 disabled:shadow-none"
      >
        {busy ? "در حال بررسی…" : "ورود به هلوفیت"}
      </button>

      <div className="text-center text-xs text-ink-muted">
        {expired ? (
          <button type="button" onClick={onResend} disabled={busy} className="font-bold text-primary-700">
            ارسال دوباره کد
          </button>
        ) : (
          <span>
            ارسال دوباره کد پس از{" "}
            <span dir="ltr" className="font-bold tabular-nums text-ink">
              {faDuration(remaining)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
