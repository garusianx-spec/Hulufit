"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArticleCard } from "./ArticleCard";
import { Chip, EmptyState, Sep } from "@/components/ui/Bits";
import { ArticleIcon, BookmarkIcon, CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { ARTICLE_CATEGORIES, articles } from "@/lib/mock/articles";
import { useAppStore } from "@/lib/store/AppStore";
import { faNumber } from "@/lib/format";
import type { ArticleCategory } from "@/types";

type Filter = ArticleCategory | "all" | "saved";

/** Evidence-based knowledge base: search, category chips, bookmarks. */
export function ArticleFeed() {
  const { bookmarks } = useAppStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "saved" ? bookmarks.includes(article.id) : article.category === filter);
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tags.some((t) => t.toLowerCase().includes(q)) ||
        article.author.name.toLowerCase().includes(q)
      );
    });
  }, [bookmarks, filter, query]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-2.5">
          <SearchIcon width={18} height={18} className="shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در مقالات، نویسندگان و برچسب‌ها…"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
            type="search"
            inputMode="search"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن" className="text-ink-soft">
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-0.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          همه
        </Chip>
        {ARTICLE_CATEGORIES.map((category) => (
          <Chip
            key={category.key}
            active={filter === category.key}
            onClick={() => setFilter(category.key)}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.label}
          </Chip>
        ))}
        <Chip active={filter === "saved"} onClick={() => setFilter("saved")}>
          <BookmarkIcon width={12} height={12} />
          ذخیره‌شده {bookmarks.length > 0 && `(${faNumber(bookmarks.length)})`}
        </Chip>
      </div>

      <p className="px-4 text-2xs text-ink-muted">
        {faNumber(results.length)} مقاله
        <Sep />
        همه‌ی مطالب توسط تیم علمی هلوفیت بازبینی شده‌اند
      </p>

      {/* Results */}
      <div className="flex flex-col gap-3 px-4">
        <AnimatePresence mode="popLayout">
          {results.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={<ArticleIcon width={24} height={24} />}
                title="مقاله‌ای پیدا نشد"
                description="عبارت دیگری را جستجو کنید یا دسته‌بندی را تغییر دهید."
              />
            </motion.div>
          ) : (
            results.map((article, index) => (
              <ArticleCard key={article.id} article={article} featured={index === 0 && filter === "all" && !query} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
