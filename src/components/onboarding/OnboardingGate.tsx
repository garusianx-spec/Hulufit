"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";

/**
 * Routes a user with an unfinished assessment into the wizard.
 *
 * This is a health-assessment gate, not an auth gate: the app still has no
 * login, and the seeded mock user already has `completedAt` set, so the demo
 * lands on the dashboard exactly as before. Clearing the assessment from
 * Profile ("شبیه‌سازی کاربر جدید") is what sends you here.
 */
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { needsOnboarding, hydrated, role } = useAppStore();

  useEffect(() => {
    // Wait for localStorage — redirecting before hydration would bounce a user
    // who has already completed the wizard.
    if (!hydrated) return;
    // Sign-in comes first; the wizard must not fight the auth redirect.
    if (pathname.startsWith("/auth")) return;
    // Only a client has an assessment to complete.
    if (role !== "client") return;
    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [hydrated, needsOnboarding, pathname, role, router]);

  return null;
}
