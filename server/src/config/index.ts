import { z } from "zod";

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

export type Config = z.infer<typeof schema> & { corsOrigins: string[] };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }

  const config = parsed.data;

  // A development placeholder must never reach production.
  if (config.NODE_ENV === "production" && config.JWT_SECRET.includes("dev-only")) {
    throw new Error("JWT_SECRET is still the development placeholder — refusing to boot.");
  }

  return {
    ...config,
    corsOrigins: config.CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
