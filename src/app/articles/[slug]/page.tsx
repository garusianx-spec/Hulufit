"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState } from "@/components/ui/Bits";
import { ArticleIcon } from "@/components/ui/Icons";
import { ArticleReader } from "@/components/articles/ArticleReader";
import { findArticle } from "@/lib/mock/articles";

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const article = findArticle(slug);

  if (!article) {
    return (
      <AppShell header={<AppHeader variant="page" title="مقاله" backHref="/articles" />}>
        <EmptyState
          icon={<ArticleIcon width={24} height={24} />}
          title="این مقاله در دسترس نیست"
          description="ممکن است حذف یا جابه‌جا شده باشد."
          action={
            <Link href="/articles" className="app-btn-ghost mt-2">
              بازگشت به مقالات
            </Link>
          }
        />
      </AppShell>
    );
  }

  return <ArticleReader article={article} />;
}
