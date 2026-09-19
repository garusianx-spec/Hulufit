import { z } from "zod";
import { parseDuration } from "../lib/duration.js";

/**
 * Environment is parsed once, at boot, and every module reads the typed result.
 * A bad value fails the process immediately rather than surfacing as a
 * confusing runtime error under load.
 */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  JWT_SECRET: z.string().min(16),
  JWT_ISSUER: z.string().default("hellofit"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  /** Empty ⇒ host-only cookie, which is the safest default. */
  COOKIE_DOMAIN: z.string().default(""),

  OTP_TTL_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(120),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  /** Per-deployment pepper for the code hashes. Required in production. */
  OTP_PEPPER: z.string().default(""),

  SMS_PROVIDER: z.enum(["console", "kavenegar"]).default("console"),
  SMS_API_KEY: z.string().default(""),
  SMS_TEMPLATE: z.string().default("hellofit-otp"),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("hellofit-media"),
  S3_ACCESS_KEY: z.string().default(""),
  S3_SECRET_KEY: z.string().default(""),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  CDN_BASE_URL: z.string().default(""),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(30 * 1024 * 1024),
  PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

export type Config = z.infer<typeof schema> & {
  corsOrigins: string[];
  /** `REFRESH_TOKEN_TTL` in milliseconds, for the cookie `maxAge`. */
  REFRESH_TOKEN_TTL_MS: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }

  const config = parsed.data;

  // Development placeholders must never reach production.
  if (config.NODE_ENV === "production") {
    if (config.JWT_SECRET.includes("dev-only")) {
      throw new Error("JWT_SECRET is still the development placeholder — refusing to boot.");
    }
    if (config.OTP_PEPPER.length < 16) {
      throw new Error("OTP_PEPPER must be at least 16 characters in production.");
    }
    if (config.SMS_PROVIDER === "console") {
      throw new Error("SMS_PROVIDER=console cannot be used in production.");
    }
  }

  // Parsed eagerly so a malformed duration fails at boot, not at first login.
  const refreshTtlMs = parseDuration(config.REFRESH_TOKEN_TTL);
  parseDuration(config.ACCESS_TOKEN_TTL);

  return {
    ...config,
    REFRESH_TOKEN_TTL_MS: refreshTtlMs,
    corsOrigins: config.CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
