import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { OTP_LENGTH } from "./otp.schemas.js";

/**
 * OTP challenge storage.
 *
 * Codes are never stored in the clear — only a salted SHA-256 — so a dump of
 * this store (or of the Redis that replaces it) does not hand an attacker a
 * live login. Comparison is constant-time, and a challenge is destroyed on
 * first success or after `maxAttempts`, which is what stops a 5-digit code
 * from being brute-forced inside its own lifetime.
 */

export interface Challenge {
  phone: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
  /** Earliest timestamp at which a resend is allowed. */
  resendAt: number;
  createdAt: number;
}

export type VerifyOutcome =
  | { status: "ok" }
  | { status: "no_challenge" }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "mismatch"; attemptsLeft: number };

export interface OtpStoreOptions {
  ttlSeconds: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  /** Per-deployment pepper, so hashes are not portable between environments. */
  pepper: string;
}

function hashCode(code: string, phone: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${phone}:${code}`).digest("hex");
}

/** Cryptographically uniform 5-digit code, zero-padded. */
export function generateCode(length = OTP_LENGTH): string {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, "0");
}

export class OtpStore {
  private challenges = new Map<string, Challenge>();

  constructor(private options: OtpStoreOptions) {}

  /**
   * @returns the plain code to send, or the seconds to wait when the caller is
   * still inside the resend cooldown.
   */
  issue(phone: string, now = Date.now()): { code: string } | { cooldown: number } {
    this.sweep(now);

    const existing = this.challenges.get(phone);
    if (existing && existing.resendAt > now) {
      return { cooldown: Math.ceil((existing.resendAt - now) / 1000) };
    }

    const code = generateCode();
    this.challenges.set(phone, {
      phone,
      codeHash: hashCode(code, phone, this.options.pepper),
      expiresAt: now + this.options.ttlSeconds * 1000,
      attemptsLeft: this.options.maxAttempts,
      resendAt: now + this.options.resendCooldownSeconds * 1000,
      createdAt: now,
    });

    return { code };
  }

  verify(phone: string, code: string, now = Date.now()): VerifyOutcome {
    const challenge = this.challenges.get(phone);
    if (!challenge) return { status: "no_challenge" };

    if (challenge.expiresAt <= now) {
      this.challenges.delete(phone);
      return { status: "expired" };
    }
    if (challenge.attemptsLeft <= 0) {
      this.challenges.delete(phone);
      return { status: "locked" };
    }

    const candidate = Buffer.from(hashCode(code, phone, this.options.pepper), "hex");
    const expected = Buffer.from(challenge.codeHash, "hex");
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);

    if (!match) {
      challenge.attemptsLeft -= 1;
      if (challenge.attemptsLeft <= 0) {
        this.challenges.delete(phone);
        return { status: "locked" };
      }
      return { status: "mismatch", attemptsLeft: challenge.attemptsLeft };
    }

    // Single-use: a correct code cannot be replayed.
    this.challenges.delete(phone);
    return { status: "ok" };
  }

  /** Seconds remaining on the live challenge, for the client's countdown. */
  ttlFor(phone: string, now = Date.now()): number {
    const challenge = this.challenges.get(phone);
    if (!challenge || challenge.expiresAt <= now) return 0;
    return Math.ceil((challenge.expiresAt - now) / 1000);
  }

  get size(): number {
    return this.challenges.size;
  }

  private sweep(now: number): void {
    for (const [key, challenge] of this.challenges) {
      if (challenge.expiresAt <= now) this.challenges.delete(key);
    }
  }
}
