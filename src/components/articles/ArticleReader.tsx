"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuthorChip } from "./AuthorChip";
import { BookmarkToggle } from "./BookmarkToggle";
import { ArticleCard } from "./ArticleCard";
import { Card } from "@/components/ui/Bits";
import { ClockIcon, ShieldIcon } from "@/components/ui/Icons";
import { articles, CATEGORY_LABEL } from "@/lib/mock/articles";
import { cx, faDate, faNumber } from "@/lib/format";
import type { Article, ArticleBlock } from "@/types";

/** Reader view: progress bar, credential chip, typographic body, references. */
export function ArticleReader({ article }: { article: Article }) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [fontScale, setFontScale] = useState(1);

  const { scrollYProgress } = useScroll({ container: paneRef });
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 34, mass: 0.3 });

  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [article.id]);

  const related = articles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 2);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      <AppHeader
        variant="page"
        title={CATEGORY_LABEL[article.category]}
        subtitle={`${faNumber(article.readingMinutes)} دقیقه مطالعه`}
        backHref="/articles"
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFontScale((s) => (s >= 1.3 ? 0.9 : Number((s + 0.2).toFixed(1))))}
              aria-label="تغییر اندازه متن"
              className="tap-target inline-flex items-baseline gap-0.5 rounded-pill px-2 py-1 font-extrabold text-ink"
            >
              <span className="text-sm leading-none">آ</span>
              <span className="text-[0.62rem] leading-none">آ</span>
            </button>
            <BookmarkToggle articleId={article.id} size={20} />
          </div>
        }
      >
        <motion.div
          className="h-0.5 origin-right bg-primary-600"
          style={{ scaleX: progress }}
        />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col overflow-hidden">
        <div ref={paneRef} className="scroll-pane flex-1">
          {/* Hero */}
          <div
            className="relative h-36"
            style={{
              background: `linear-gradient(135deg, ${article.coverColor}26 0%, ${article.coverColor}0A 100%)`,
            }}
          >
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 320 140">
              <circle cx="280" cy="26" r="54" fill={article.coverColor} opacity="0.12" />
              <path
                d="M-10 110c44-30 78 10 120-16s68-44 110-28 76 44 140 24"
                stroke={article.coverColor}
                strokeWidth="2"
                fill="none"
                opacity="0.24"
              />
            </svg>
          </div>

          <div className="-mt-8 px-4">
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-pill px-2.5 py-1 text-[0.6rem] font-extrabold text-white"
                  style={{ background: article.coverColor }}
                >
                  {CATEGORY_LABEL[article.category]}
                </span>
                <span className="flex items-center gap-1 rounded-pill bg-primary-50 px-2 py-1 text-[0.6rem] font-bold text-primary-700">
                  <ShieldIcon width={11} height={11} />
                  سطح شواهد {article.evidenceLevel}
                </span>
                <span className="flex items-center gap-1 rounded-pill bg-canvas px-2 py-1 text-[0.6rem] text-ink-muted">
                  <ClockIcon width={11} height={11} />
                  {faNumber(article.readingMinutes)} دقیقه
                </span>
              </div>

              <h1 className="text-lg font-extrabold leading-8 text-ink">{article.title}</h1>
              <p className="text-xs leading-6 text-ink-muted">{article.excerpt}</p>

              <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                <AuthorChip author={article.author} />
                <span className="shrink-0 text-2xs text-ink-soft">{faDate(article.publishedAt, true)}</span>
              </div>
            </Card>
          </div>

          {/* Body */}
          <article
            className="flex flex-col gap-3.5 px-4 py-5"
            style={{ fontSize: `${fontScale}rem` }}
          >
            {article.body.map((block, index) => (
              <BlockRenderer key={index} block={block} />
            ))}
          </article>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {article.tags.map((tag) => (
              <span key={tag} className="app-chip">
                #{tag}
              </span>
            ))}
          </div>

          {/* References */}
          <div className="px-4 pb-4">
            <Card>
              <p className="mb-2 text-xs font-extrabold text-ink">منابع علمی</p>
              <ol className="flex list-inside list-decimal flex-col gap-1.5">
                {article.references.map((reference) => (
                  <li key={reference} dir="ltr" className="text-left text-[0.65rem] leading-5 text-ink-muted">
                    {reference}
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="flex flex-col gap-3 px-4 pb-4">
              <h2 className="section-title">مقالات مرتبط</h2>
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          )}

          <div className="px-4 pb-10">
            <Link href="/specialists" className="app-btn-primary w-full">
              سؤالی دارید؟ با یک متخصص مشورت کنید
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function BlockRenderer({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-2 text-[1.05em] font-extrabold leading-7 text-ink">{block.text}</h2>;

    case "p":
      return <p className="text-[0.82em] leading-[2] text-ink">{block.text}</p>;

    case "list":
      return (
        <ul className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3.5">
          {block.items.map((li) => (
            <li key={li} className="flex gap-2 text-[0.78em] leading-7 text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
              <span>{li}</span>
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote className="border-r-4 border-primary-500 bg-primary-50/60 px-4 py-3">
          <p className="text-[0.8em] font-bold leading-7 text-primary-800">«{block.text}»</p>
          {block.cite && <cite className="mt-1 block text-2xs not-italic text-primary-700">— {block.cite}</cite>}
        </blockquote>
      );

    case "callout":
      return (
        <div
          className={cx(
            "rounded-card border p-3.5",
            block.tone === "warn"
              ? "border-warn-100 bg-warn-50"
              : "border-sky-200 bg-sky-50",
          )}
        >
          <p
            className={cx(
              "text-[0.76em] font-extrabold",
              block.tone === "warn" ? "text-warn-600" : "text-sky-700",
            )}
          >
            {block.tone === "warn" ? "⚠️" : "💡"} {block.title}
          </p>
          <p
            className={cx(
              "mt-1 text-[0.76em] leading-7",
              block.tone === "warn" ? "text-warn-600" : "text-sky-800",
            )}
          >
            {block.text}
          </p>
        </div>
      );

    default:
      return null;
  }
}
