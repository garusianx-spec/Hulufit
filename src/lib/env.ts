import { z } from "zod";

/**
 * Public runtime configuration.
 *
 * Next inlines `NEXT_PUBLIC_*` at build time, so these must be read as whole
 * literals — `process.env[name]` would be left untouched by the compiler and
 * come back undefined in the browser. Parsing happens at module load, which is
 * app startup for anything that imports it: a misconfigured deployment fails
 * loudly on the first render instead of silently pointing at nothing.
 *
 * Nothing secret lives here. A `NEXT_PUBLIC_` value is shipped to every visitor.
 */
const schema = z.object({
  /** Origin of the gateway, e.g. `https://api.hellofit.ir`. Empty ⇒ same origin. */
  apiBaseUrl: z.string().default(""),
  /**
   * `live` talks to the gateway. `mock` emulates sign-in in the browser so the
   * PWA demo runs with no backend — it is refused in a production build.
   */
  authMode: z.enum(["live", "mock"]).default("mock"),
  /** Canonical origin, for metadata, sitemap and Digital Asset Links. */
  siteUrl: z.string().default("https://app.hellofit.ir"),
});

export type PublicEnv = z.infer<typeof schema>;

function read(): PublicEnv {
  const parsed = schema.safeParse({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    authMode: process.env.NEXT_PUBLIC_AUTH_MODE ?? (process.env.NODE_ENV === "production" ? "live" : "mock"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.hellofit.ir",
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid public environment — ${issues}`);
  }

  if (process.env.NODE_ENV === "production" && parsed.data.authMode === "mock") {
    throw new Error("NEXT_PUBLIC_AUTH_MODE=mock cannot be used in a production build.");
  }

  return parsed.data;
}

export const env = read();
