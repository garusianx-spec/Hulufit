/**
 * Sliding-window rate limiter.
 *
 * Auth is the one surface where an attacker gets unlimited free attempts, so
 * every entry point is limited on two independent keys: the phone number (stops
 * one number being pounded from many IPs) and the client IP (stops one host
 * walking the number space). Either tripping is enough to refuse.
 *
 * In-memory and therefore per-process. Behind more than one node, back this
 * with Redis — the interface does not change.
 */
export interface RateLimitVerdict {
  allowed: boolean;
  /** Seconds until the caller may retry. 0 when allowed. */
  retryAfter: number;
  remaining: number;
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(private rule: RateLimitRule) {}

  check(key: string, now = Date.now()): RateLimitVerdict {
    this.sweep(now);

    const cutoff = now - this.rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= this.rule.limit) {
      const oldest = recent[0] ?? now;
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((oldest + this.rule.windowMs - now) / 1000)),
        remaining: 0,
      };
    }

    return { allowed: true, retryAfter: 0, remaining: this.rule.limit - recent.length - 1 };
  }

  /** Records an attempt. Call only once the request is actually served. */
  hit(key: string, now = Date.now()): void {
    const cutoff = now - this.rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    recent.push(now);
    this.hits.set(key, recent);
  }

  /** Clears a key — used after a successful verify, so a login is not punished. */
  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Drops empty buckets so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.rule.windowMs) return;
    this.lastSweep = now;
    const cutoff = now - this.rule.windowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((t) => t > cutoff);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

/** Limits applied to the OTP endpoints. */
export const AUTH_LIMITS = {
  /** Per phone: 3 sends in 10 minutes. */
  sendPerPhone: { limit: 3, windowMs: 10 * 60_000 },
  /** Per IP: 10 sends in 10 minutes — a shared NAT still works. */
  sendPerIp: { limit: 10, windowMs: 10 * 60_000 },
  /** Per phone: 10 verify attempts in 10 minutes, on top of the per-code cap. */
  verifyPerPhone: { limit: 10, windowMs: 10 * 60_000 },
  verifyPerIp: { limit: 30, windowMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;
