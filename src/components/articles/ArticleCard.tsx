"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookmarkToggle } from "./BookmarkToggle";
import { AuthorChip } from "./AuthorChip";
import { ClockIcon } from "@/components/ui/Icons";
import { CATEGORY_LABEL } from "@/lib/mock/articles";
import { cx, faNumber, faRelative } from "@/lib/format";
import type { Article } from "@/types";

/** Feed card: cover, category, reading time, author credential, bookmark. */
export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="app-card overflow-hidden"
    >
      <Link href={`/articles/${article.slug}`} className="block">
        <div
          className={cx("relative overflow-hidden", featured ? "h-32" : "h-20")}
          style={{
            background: `linear-gradient(135deg, ${article.coverColor}22 0%, ${article.coverColor}08 100%)`,
          }}
        >
          <CoverPattern color={article.coverColor} />
          <span
            className="absolute right-3 top-3 rounded-pill px-2.5 py-1 text-[0.6rem] font-extrabold text-white"
            style={{ background: article.coverColor }}
          >
            {CATEGORY_LABEL[article.category]}
          </span>
          <span className="absolute left-3 top-3 rounded-pill bg-surface/90 px-2 py-1 text-[0.58rem] font-bold text-ink backdrop-blur">
            سطح شواهد {article.evidenceLevel}
          </span>
        </div>

        <div className="p-3.5">
          <h3 className={cx("font-extrabold leading-6 text-ink", featured ? "text-sm" : "text-xs")}>
            {article.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-2xs leading-5 text-ink-muted">{article.excerpt}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5">
        <AuthorChip author={article.author} compact />
        <span className="mr-auto flex items-center gap-1 text-[0.6rem] text-ink-soft">
          <ClockIcon width={11} height={11} />
          {faNumber(article.readingMinutes)} دقیقه
        </span>
        <span className="text-[0.6rem] text-ink-soft">{faRelative(article.publishedAt)}</span>
        <BookmarkToggle articleId={article.id} />
      </div>
    </motion.article>
  );
}

/** Decorative cover so the feed reads well without any image assets. */
function CoverPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 320 120">
      <circle cx="270" cy="20" r="46" fill={color} opacity="0.12" />
      <circle cx="300" cy="90" r="28" fill={color} opacity="0.10" />
      <path
        d="M-10 96c40-26 70 8 108-14s62-40 100-26 70 40 132 22"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.22"
      />
    </svg>
  );
}
