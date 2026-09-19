import { z } from "zod";
import { parseIranianMobile } from "./phone.js";

/**
 * Every auth payload is validated at the edge. The phone field re-uses the
 * canonical parser, so a route handler only ever sees `+989XXXXXXXXX`.
 */

export const OTP_LENGTH = 5;

const phoneField = z
  .string()
  .min(1)
  .max(20)
  .transform((value, ctx) => {
    const parsed = parseIranianMobile(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.message });
      return z.NEVER;
    }
    return parsed.msisdn;
  });

export const requestOtpSchema = z.object({
  phone: phoneField,
  /** Opaque per-device id; scopes the refresh token to one browser. */
  deviceId: z.string().min(8).max(64).optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneField,
  code: z
    .string()
    .transform((v) => v.replace(/[^\d۰-۹٠-٩]/g, ""))
    .pipe(z.string().length(OTP_LENGTH, `کد باید ${OTP_LENGTH} رقم باشد.`)),
  deviceId: z.string().min(8).max(64).optional(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
