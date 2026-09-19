import { logger } from "../../lib/logger.js";
import { maskMsisdn } from "./phone.js";

/**
 * SMS delivery.
 *
 * Behind an interface so the provider is a deployment decision, not a code
 * change. The console provider is the development default; it is the only one
 * that ever reveals a code, and it refuses to run in production.
 */
export interface SmsProvider {
  readonly name: string;
  send(to: string, text: string): Promise<void>;
}

export function otpMessage(code: string): string {
  // Persian carriers render RTL text fine; the code is isolated so bidi
  // reordering cannot scramble the digits the user has to type.
  return `هلوفیت\nکد ورود شما: ${code}\nاین کد تا ۲ دقیقه معتبر است.\nآن را با کسی به اشتراک نگذارید.`;
}

/** Logs instead of sending. Development and tests only. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";

  async send(to: string, text: string): Promise<void> {
    logger.info({ to: maskMsisdn(to), text }, "[sms:console] would send");
  }
}

/**
 * Kavenegar — a common Iranian gateway.
 *
 * Uses the verify-lookup endpoint rather than plain send: Iranian carriers
 * require a pre-approved template for transactional traffic, and lookup is not
 * subject to the marketing opt-out list.
 */
export class KavenegarSmsProvider implements SmsProvider {
  readonly name = "kavenegar";

  constructor(
    private apiKey: string,
    private template: string,
  ) {}

  async send(to: string, text: string): Promise<void> {
    // The template renders the message; `token` carries the code alone.
    const code = text.match(/(\d{4,8})/)?.[1] ?? "";
    const receptor = to.replace(/^\+98/, "0");
    const url =
      `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/verify/lookup.json` +
      `?receptor=${encodeURIComponent(receptor)}` +
      `&token=${encodeURIComponent(code)}` +
      `&template=${encodeURIComponent(this.template)}`;

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`kavenegar ${response.status}: ${body.slice(0, 200)}`);
    }
  }
}

export function createSmsProvider(config: {
  provider: string;
  apiKey: string;
  template: string;
  isProduction: boolean;
}): SmsProvider {
  if (config.provider === "kavenegar") {
    if (!config.apiKey) throw new Error("SMS_API_KEY is required for the kavenegar provider.");
    return new KavenegarSmsProvider(config.apiKey, config.template);
  }
  if (config.isProduction) {
    throw new Error("SMS_PROVIDER=console is refused in production — configure a real gateway.");
  }
  return new ConsoleSmsProvider();
}
