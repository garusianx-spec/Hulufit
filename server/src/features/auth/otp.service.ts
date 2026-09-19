import type { Config } from "../../config/index.js";
import type { Repository } from "../../db/repository.js";
import { ApiError } from "../../lib/errors.js";
import { id as newId } from "../../lib/ids.js";
import { logger } from "../../lib/logger.js";
import { maskMsisdn } from "./phone.js";
import { OtpStore } from "./otp.store.js";
import { AUTH_LIMITS, SlidingWindowLimiter } from "./rateLimit.js";
import type { SessionClaims } from "./session.js";
import { createSmsProvider, otpMessage, type SmsProvider } from "./sms.provider.js";

/**
 * Passwordless sign-in, as a service.
 *
 * Every decision that matters — who may ask for a code, whether a code is
 * right, what a successful login is allowed to see — lives here, so the HTTP
 * layer stays a thin translation of results into status codes and the same
 * logic can be driven straight from a test.
 */

export interface RequestCodeResult {
  /** Seconds the code stays valid — the client countdown. */
  expiresIn: number;
  /** Seconds before another send is accepted. */
  resendAfter: number;
  masked: string;
  /** Present only outside production, with the console provider. */
  devCode?: string;
}

export class AuthService {
  private readonly otp: OtpStore;
  private readonly sms: SmsProvider;
  private readonly sendPerPhone = new SlidingWindowLimiter(AUTH_LIMITS.sendPerPhone);
  private readonly sendPerIp = new SlidingWindowLimiter(AUTH_LIMITS.sendPerIp);
  private readonly verifyPerPhone = new SlidingWindowLimiter(AUTH_LIMITS.verifyPerPhone);
  private readonly verifyPerIp = new SlidingWindowLimiter(AUTH_LIMITS.verifyPerIp);

  constructor(
    private readonly config: Config,
    private readonly repo: Repository,
    sms?: SmsProvider,
  ) {
    this.otp = new OtpStore({
      ttlSeconds: config.OTP_TTL_SECONDS,
      resendCooldownSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
      maxAttempts: config.OTP_MAX_ATTEMPTS,
      pepper: config.OTP_PEPPER,
    });
    this.sms =
      sms ??
      createSmsProvider({
        provider: config.SMS_PROVIDER,
        apiKey: config.SMS_API_KEY,
        template: config.SMS_TEMPLATE,
        isProduction: config.NODE_ENV === "production",
      });
  }

  async requestCode(phone: string, ip: string): Promise<RequestCodeResult> {
    this.guard(this.sendPerPhone, phone, "تعداد درخواست‌ها زیاد است.");
    this.guard(this.sendPerIp, ip, "تعداد درخواست‌ها از این دستگاه زیاد است.");

    const issued = this.otp.issue(phone);
    if ("cooldown" in issued) {
      throw ApiError.tooManyRequests(
        "کد قبلی هنوز معتبر است. کمی صبر کنید و دوباره تلاش کنید.",
        issued.cooldown,
      );
    }

    // Counted only once the code is really minted, so a cooldown reply does
    // not eat the caller's quota.
    this.sendPerPhone.hit(phone);
    this.sendPerIp.hit(ip);

    try {
      await this.sms.send(phone, otpMessage(issued.code));
    } catch (error) {
      logger.error({ err: error, to: maskMsisdn(phone) }, "otp delivery failed");
      throw new ApiError(502, "sms_failed", "ارسال پیامک ناموفق بود. دوباره تلاش کنید.");
    }

    return {
      expiresIn: this.config.OTP_TTL_SECONDS,
      resendAfter: this.config.OTP_RESEND_COOLDOWN_SECONDS,
      masked: maskMsisdn(phone),
      // A code is echoed only where no real SMS went out, so there is nowhere
      // else to read it from.
      ...(this.canEchoCode() ? { devCode: issued.code } : {}),
    };
  }

  async verifyCode(phone: string, code: string, ip: string): Promise<SessionClaims> {
    this.guard(this.verifyPerPhone, phone, "تعداد تلاش‌ها زیاد است.");
    this.guard(this.verifyPerIp, ip, "تعداد تلاش‌ها از این دستگاه زیاد است.");
    this.verifyPerPhone.hit(phone);
    this.verifyPerIp.hit(ip);

    const outcome = this.otp.verify(phone, code);
    switch (outcome.status) {
      case "no_challenge":
        throw ApiError.badRequest("no_challenge", "کدی برای این شماره صادر نشده است.");
      case "expired":
        throw ApiError.badRequest("code_expired", "کد منقضی شده است. کد تازه بگیرید.");
      case "locked":
        throw ApiError.badRequest(
          "code_locked",
          "تعداد تلاش‌های نادرست زیاد بود. کد تازه بگیرید.",
        );
      case "mismatch":
        throw ApiError.badRequest("code_mismatch", "کد وارد شده درست نیست.", {
          attemptsLeft: outcome.attemptsLeft,
        });
      case "ok":
        break;
    }

    // A completed login clears the attempt counters for that number.
    this.verifyPerPhone.reset(phone);
    this.sendPerPhone.reset(phone);

    const user = (await this.repo.getUserByPhone(phone)) ?? (await this.register(phone));
    const threads = await this.repo.listThreadsFor(user.id);

    logger.info({ userId: user.id, role: user.role }, "otp sign-in");
    return {
      sub: user.id,
      role: user.role,
      name: user.name,
      threads: threads.map((t) => t.id),
    };
  }

  /** Seconds left on a live challenge — lets a reloaded page resume its timer. */
  remainingFor(phone: string): number {
    return this.otp.ttlFor(phone);
  }

  /** First sign-in creates a client account; the web onboarding fills the rest. */
  private async register(phone: string) {
    return this.repo.upsertUser({
      id: newId("u"),
      role: "client",
      name: "",
      phone,
      avatarKey: null,
      createdAt: new Date().toISOString(),
    });
  }

  private canEchoCode(): boolean {
    return this.config.NODE_ENV !== "production" && this.sms.name === "console";
  }

  private guard(limiter: SlidingWindowLimiter, key: string, message: string): void {
    const verdict = limiter.check(key);
    if (!verdict.allowed) throw ApiError.tooManyRequests(message, verdict.retryAfter);
  }
}
