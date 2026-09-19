import { cx } from "@/lib/format";

/**
 * Loading placeholders.
 *
 * A sheen travelling right-to-left, following the reading direction, over a
 * block the same size as the content that will replace it — so nothing jumps
 * when the real thing arrives. `prefers-reduced-motion` drops the sheen and
 * leaves the block, which is handled globally in `globals.css`.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("relative block overflow-hidden rounded-lg bg-slate-200/70", className)}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-l from-transparent via-white/70 to-transparent" />
    </span>
  );
}

/** A few lines of text, the last one short, the way a paragraph really ends. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cx("block space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </span>
  );
}

/** Stands in for a whole card while its data loads. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cx("app-card space-y-3 p-4", className)} role="status" aria-label="در حال بارگذاری">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
