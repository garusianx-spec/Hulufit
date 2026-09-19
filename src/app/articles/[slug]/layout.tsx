import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { env } from "@/lib/env";
import { articles, findArticle } from "@/lib/mock/articles";

/**
 * Article metadata lives here because the reader below is a client component
 * and `generateMetadata` only runs on the server. Splitting them keeps the
 * interactive reader interactive and still gives every article a real title,
 * a canonical URL and an Article node for search.
 */

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return { title: "مقاله یافت نشد", robots: { index: false, follow: false } };

  const url = `/articles/${article.slug}`;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "fa_IR",
      title: article.title,
      description: article.excerpt,
      url,
      publishedTime: article.publishedAt,
      authors: [article.author.name],
      tags: article.tags,
    },
    twitter: { card: "summary", title: article.title, description: article.excerpt },
  };
}

/** Pre-renders the known slugs; anything else still resolves at request time. */
export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export default async function ArticleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { slug } = await params;
  const article = findArticle(slug);

  return (
    <>
      {article && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.excerpt,
            inLanguage: "fa-IR",
            datePublished: article.publishedAt,
            keywords: article.tags.join(", "),
            author: {
              "@type": "Person",
              name: article.author.name,
              jobTitle: article.author.credential,
            },
            publisher: {
              "@type": "Organization",
              name: "هلوفیت",
              logo: { "@type": "ImageObject", url: `${env.siteUrl}/icons/icon-512.png` },
            },
            mainEntityOfPage: `${env.siteUrl}/articles/${article.slug}`,
            timeRequired: `PT${article.readingMinutes}M`,
          }}
        />
      )}
      {children}
    </>
  );
}
