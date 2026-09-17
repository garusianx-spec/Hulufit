"use client";

import { motion } from "framer-motion";
import { BookmarkIcon } from "@/components/ui/Icons";
import { useAppStore } from "@/lib/store/AppStore";
import { cx } from "@/lib/format";

/** Bookmarking toggle, persisted through the app store. */
export function BookmarkToggle({ articleId, size = 18 }: { articleId: string; size?: number }) {
  const { bookmarks, dispatch } = useAppStore();
  const saved = bookmarks.includes(articleId);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: "article/toggleBookmark", id: articleId });
      }}
      aria-pressed={saved}
      aria-label={saved ? "حذف از ذخیره‌شده‌ها" : "ذخیره مقاله"}
      className={cx(
        "tap-target grid shrink-0 place-items-center rounded-pill p-1.5 transition-colors",
        saved ? "text-primary-600" : "text-ink-soft",
      )}
    >
      <BookmarkIcon width={size} height={size} fill={saved ? "currentColor" : "none"} />
    </motion.button>
  );
}
