import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { articles } from "@/lib/mock/articles";

/**
 * The public surface: the articles index and each article. Authenticated
 * routes are left out on purpose — a sitemap is an invitation, and nothing
 * behind sign-in should be inviting a crawler.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl.replace(/\/$/, "");

  return [
    {
      url: `${base}/articles`,
      lastModified: articles[0]?.publishedAt ?? new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${base}/articles/${article.slug}`,
      lastModified: article.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
