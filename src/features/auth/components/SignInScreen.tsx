"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLockup } from "@/components/layout/Logo";
import { useAuth } from "../hooks/AuthProvider";
import { useCountdown } from "../hooks/useCountdown";
import { AuthError } from "../lib/gateway";
import { landingFor, mayOpen } from "../lib/session";
import { CodeStep } from "./CodeStep";
import { PhoneStep } from "./PhoneStep";

/**
 * The whole sign-in flow: number → code → wherever the role belongs.
 *
 * Steps slide along the reading direction — forward moves the incoming step in
 * from the left, which in RTL is "onward".
 */

const slide = {
  enter: (forward: boolean) => ({ opacity: 0, x: forward ? -28 : 28 }),
  center: { opacity: 1, x: 0 },
  exit: (forward: boolean) => ({ opacity: 0, x: forward ? 28 : -28 }),
};

export function SignInScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, principal, requestCode, verifyCode } = useAuth();
  const { remaining, start, stop } = useCountdown();

  const [msisdn, setMsisdn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

  /** Honours `?next=` when the role is allowed there, else the role's home. */
  const destination = useCallback(
    (role: Parameters<typeof landingFor>[0]) => {
      const next = params.get("next");
      return next?.startsWith("/") && mayOpen(role, next) ? next : landingFor(role);
    },
    [params],
  );

  // Someone who is already signed in has no business on this screen.
  useEffect(() => {
    if (status === "authenticated" && principal) router.replace(destination(principal.role));
  }, [status, principal, router, destination]);

  const send = useCallback(
    async (target: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await requestCode(target);
        setMsisdn(target);
        setDevCode(result.devCode);
        setAttemptsLeft(null);
        start(result.expiresIn);
      } catch (cause) {
        // A cooldown is not a failure: show the code screen with the real timer.
        if (cause instanceof AuthError && cause.code === "rate_limited" && cause.retryAfter) {
          setMsisdn(target);
          start(cause.retryAfter);
        }
        setError(cause instanceof Error ? cause.message : "ارسال کد ناموفق بود.");
      } finally {
        setBusy(false);
      }
    },
    [requestCode, start],
  );

  const submitCode = useCallback(
    async (code: string) => {
      if (!msisdn || busy) return;
      setBusy(true);
      setError(null);
      try {
        const who = await verifyCode(msisdn, code);
        stop();
        router.replace(destination(who.role));
      } catch (cause) {
        setAttemptsLeft(cause instanceof AuthError ? (cause.attemptsLeft ?? null) : null);
        setError(cause instanceof Error ? cause.message : "ورود ناموفق بود.");
      } finally {
        setBusy(false);
      }
    },
    [msisdn, busy, verifyCode, stop, router, destination],
  );

  const onCode = Boolean(msisdn);

  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-5 pb-safe pt-safe">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <header className="space-y-3 text-center">
            <BrandLockup size={34} className="justify-center" />
            <h1 className="text-xl font-extrabold text-ink">
              {onCode ? "تأیید شماره" : "ورود یا ثبت‌نام"}
            </h1>
          </header>

          <section className="app-card p-5">
            <AnimatePresence mode="wait" custom={onCode} initial={false}>
              <motion.div
                key={onCode ? "code" : "phone"}
                custom={onCode}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              >
                {onCode && msisdn ? (
                  <CodeStep
                    msisdn={msisdn}
                    remaining={remaining}
                    busy={busy}
                    error={error}
                    attemptsLeft={attemptsLeft}
                    devCode={devCode}
                    onVerify={submitCode}
                    onResend={() => void send(msisdn)}
                    onBack={() => {
                      stop();
                      setMsisdn(null);
                      setError(null);
                      setDevCode(undefined);
                    }}
                  />
                ) : (
                  <PhoneStep busy={busy} error={error} onSubmit={(value) => void send(value)} />
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <p className="text-center text-[11px] leading-5 text-ink-muted">
            با ورود، «قوانین و شرایط استفاده» و «سیاست حریم خصوصی» هلوفیت را می‌پذیرید.
          </p>
        </div>
      </div>
    </main>
  );
}
