"use client";

import { Avatar } from "@/components/ui/Bits";
import { cx } from "@/lib/format";
import type { Article } from "@/types";

/** Author identity with the credential that makes the piece citable. */
export function AuthorChip({
  author,
  compact = false,
}: {
  author: Article["author"];
  compact?: boolean;
}) {
  return (
    <span className={cx("flex min-w-0 items-center gap-2", compact && "max-w-[60%]")}>
      <Avatar src={author.avatarUrl} name={author.name} size={compact ? 22 : 36} />
      <span className="min-w-0">
        <span
          className={cx(
            "block truncate font-bold text-ink",
            compact ? "text-[0.6rem]" : "text-xs",
          )}
        >
          {author.name}
        </span>
        {!compact && (
          <span className="mt-0.5 block truncate text-2xs text-ink-muted">{author.credential}</span>
        )}
      </span>
      {compact && (
        <span className="shrink-0 rounded-pill bg-primary-50 px-1.5 py-0.5 text-[0.52rem] font-bold text-primary-700">
          تأییدشده
        </span>
      )}
    </span>
  );
}
