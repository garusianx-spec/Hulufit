import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Only the articles are public. Everything behind sign-in is someone's health
 * data, so it is disallowed here as well as guarded — a crawler that never
 * requests the URL cannot leak its title into a search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/articles", "/articles/"],
        disallow: ["/auth", "/plans", "/profile", "/chat/", "/doctor", "/admin", "/onboarding"],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}
