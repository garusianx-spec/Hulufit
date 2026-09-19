"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { cx } from "@/lib/format";
import { ShieldIcon } from "@/components/ui/Icons";
import { checkPhone, formatNational, toNationalDigits } from "../lib/phone";

/**
 * Step one: the number.
 *
 * The field holds ASCII digits and renders Persian ones, grouped as
 * `۹۱۲ ۳۴۵ ۶۷۸۹` beside a fixed `+۹۸`. A typed leading zero is absorbed, so
 * the habitual `0912…` still works. Complaints are held back until the user
 * has typed enough for the problem to be real.
 */
export function PhoneStep({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (msisdn: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [touched, setTouched] = useState(false);

  const check = useMemo(() => checkPhone(raw), [raw]);
  const shown = touched ? (check.error ?? error) : error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (check.msisdn) onSubmit(check.msisdn);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-bold text-ink">
          شماره موبایل
        </label>

        <div
          className={cx(
            "flex items-center gap-2 rounded-2xl border bg-surface px-3.5 transition",
            "focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/12",
            shown ? "border-danger-500" : "border-line",
          )}
        >
          {/* The country code is fixed, so it is shown rather than typed. */}
          <span dir="ltr" className="shrink-0 text-sm font-bold tabular-nums text-ink-muted">
            +۹۸
          </span>
          <span aria-hidden className="h-6 w-px bg-line" />
          <input
            id="phone"
            value={formatNational(raw)}
            onChange={(e) => setRaw(toNationalDigits(e.target.value))}
            onBlur={() => setTouched(true)}
            dir="ltr"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            enterKeyHint="send"
            placeholder="۹۱۲ ۳۴۵ ۶۷۸۹"
            aria-invalid={Boolean(shown)}
            aria-describedby={shown ? "phone-error" : "phone-hint"}
            className="h-14 w-full bg-transparent text-lg font-bold tabular-nums text-ink outline-none placeholder:font-medium placeholder:text-ink-soft"
          />
        </div>

        {shown ? (
          <motion.p
            id="phone-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium text-danger-600"
          >
            {shown}
          </motion.p>
        ) : (
          <p id="phone-hint" className="text-xs text-ink-muted">
            کد ورود را با پیامک برایتان می‌فرستیم.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy || !check.complete}
        className="app-btn-primary w-full py-3.5 text-base disabled:opacity-45 disabled:shadow-none"
      >
        {busy ? "در حال ارسال…" : "دریافت کد ورود"}
      </button>

      <p className="flex items-start gap-2 text-[11px] leading-5 text-ink-muted">
        <ShieldIcon className="mt-0.5 size-4 shrink-0 text-primary-600" />
        <span>
          شماره شما فقط برای ورود و اطلاع‌رسانی برنامه استفاده می‌شود و در اختیار کسی قرار
          نمی‌گیرد.
        </span>
      </p>
    </form>
  );
}
