import type { AppRole } from "@/types";
import { AuthError, type AuthGateway, type OtpRequestResult } from "./gateway";
import { maskForDisplay } from "./phone";
import type { Principal, Session } from "./session";

/**
 * Browser-side stand-in for the gateway.
 *
 * It exists so the PWA demo — and the TWA build reviewers install — can be
 * signed into with no backend running. It is refused in a production build by
 * `src/lib/env.ts`, and it deliberately shows the code on screen rather than
 * pretending an SMS went out.
 */

const TTL_SECONDS = 120;
const COOLDOWN_SECONDS = 120;
const MAX_ATTEMPTS = 5;
const SESSION_KEY = "hellofit.mock-session";

/** The seeded accounts, so each role can be demonstrated end to end. */
const DIRECTORY: Record<string, Principal> = {
  "+989123456789": { id: "u_1", role: "client", name: "سارا رضایی", threads: ["th_1"] },
  "+989121112233": {
    id: "sp_1",
    role: "specialist",
    name: "دکتر نگار کیانی",
    threads: ["th_1", "th_2", "th_3"],
  },
  "+989120000000": { id: "admin_1", role: "admin", name: "مدیر سامانه", threads: [] },
};

interface Challenge {
  code: string;
  expiresAt: number;
  resendAt: number;
  attemptsLeft: number;
}

const challenges = new Map<string, Challenge>();

function fiveDigits(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String((buffer[0] ?? 0) % 100_000).padStart(5, "0");
}

function principalFor(phone: string): Principal {
  const known = DIRECTORY[phone];
  if (known) return known;
  // An unknown number signs up as a fresh client, exactly as the gateway does.
  return { id: `u_${phone.slice(-6)}`, role: "client" as AppRole, name: "", threads: [] };
}

function persist(session: Session): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked — the session simply does not survive a reload */
  }
}

function restore(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function sessionFor(principal: Principal): Session {
  return {
    accessToken: `mock.${btoa(unescape(encodeURIComponent(principal.id)))}.token`,
    expiresIn: "15m",
    csrfToken: `mock-csrf-${principal.id}`,
    principal,
  };
}

export const mockGateway: AuthGateway = {
  async requestCode(phone): Promise<OtpRequestResult> {
    const now = Date.now();
    const existing = challenges.get(phone);
    if (existing && existing.resendAt > now) {
      throw new AuthError(
        "rate_limited",
        "کد قبلی هنوز معتبر است. کمی صبر کنید و دوباره تلاش کنید.",
        Math.ceil((existing.resendAt - now) / 1000),
      );
    }

    const code = fiveDigits();
    challenges.set(phone, {
      code,
      expiresAt: now + TTL_SECONDS * 1000,
      resendAt: now + COOLDOWN_SECONDS * 1000,
      attemptsLeft: MAX_ATTEMPTS,
    });

    return {
      expiresIn: TTL_SECONDS,
      resendAfter: COOLDOWN_SECONDS,
      masked: maskForDisplay(phone),
      devCode: code,
    };
  },

  async verifyCode(phone, code): Promise<Session> {
    const challenge = challenges.get(phone);
    if (!challenge) throw new AuthError("no_challenge", "کدی برای این شماره صادر نشده است.");
    if (challenge.expiresAt <= Date.now()) {
      challenges.delete(phone);
      throw new AuthError("code_expired", "کد منقضی شده است. کد تازه بگیرید.");
    }
    if (challenge.code !== code) {
      challenge.attemptsLeft -= 1;
      if (challenge.attemptsLeft <= 0) {
        challenges.delete(phone);
        throw new AuthError("code_locked", "تعداد تلاش‌های نادرست زیاد بود. کد تازه بگیرید.");
      }
      throw new AuthError("code_mismatch", "کد وارد شده درست نیست.", undefined, challenge.attemptsLeft);
    }

    challenges.delete(phone);
    const session = sessionFor(principalFor(phone));
    persist(session);
    return session;
  },

  async refresh(): Promise<Session | null> {
    return restore();
  },

  async signOut(): Promise<void> {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
