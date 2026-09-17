"use client";

import { AppShell, NavSpacer } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { ArticleFeed } from "@/components/articles/ArticleFeed";

export default function ArticlesPage() {
  const refresh = async () => {
    // Production: revalidate the knowledge-base index.
    await new Promise((r) => setTimeout(r, 700));
  };

  return (
    <AppShell
      header={<AppHeader variant="page" title="مقالات علمی" subtitle="پایگاه دانش مبتنی بر شواهد" backHref="/" />}
    >
      <PullToRefresh onRefresh={refresh}>
        <div className="pt-3">
          <ArticleFeed />
        </div>
        <NavSpacer />
      </PullToRefresh>
    </AppShell>
  );
}
