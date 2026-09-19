import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInScreen } from "@/features/auth/components/SignInScreen";

export const metadata: Metadata = {
  title: "ورود به هلوفیت",
  description: "با شماره موبایل خود وارد هلوفیت شوید — بدون رمز عبور.",
  // A sign-in page has nothing to offer a search engine.
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  // `useSearchParams` inside the screen needs a boundary to stream past.
  return (
    <Suspense fallback={<main className="min-h-dvh bg-canvas" />}>
      <SignInScreen />
    </Suspense>
  );
}
