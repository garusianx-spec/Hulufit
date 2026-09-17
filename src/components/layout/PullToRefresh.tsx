"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { RefreshIcon } from "@/components/ui/Icons";

const THRESHOLD = 76;
const MAX_PULL = 120;

/**
 * Native-feeling pull-to-refresh for the standalone/TWA shell, where the
 * browser's own gesture is disabled by `overscroll-behavior: none`.
 * Only engages when the pane is already scrolled to the top.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pull = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);

  const indicatorOpacity = useTransform(pull, [0, 30, THRESHOLD], [0, 0.6, 1]);
  const indicatorRotate = useTransform(pull, [0, MAX_PULL], [0, 320]);
  const indicatorScale = useTransform(pull, [0, THRESHOLD], [0.6, 1]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      const pane = paneRef.current;
      if (!pane || pane.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    },
    [refreshing],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pull.set(0);
        return;
      }
      // Rubber-band resistance.
      pull.set(Math.min(MAX_PULL, delta * 0.55));
    },
    [pull, refreshing],
  );

  const onTouchEnd = useCallback(async () => {
    const distance = pull.get();
    startY.current = null;
    if (distance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      pull.set(THRESHOLD * 0.7);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pull.set(0);
      }
    } else {
      pull.set(0);
    }
  }, [onRefresh, pull, refreshing]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
        style={{ opacity: indicatorOpacity, y: pull }}
      >
        <motion.span
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-primary-600 shadow-card"
          style={{ scale: indicatorScale }}
        >
          <motion.span style={{ rotate: indicatorRotate }} className={refreshing ? "animate-spin" : ""}>
            <RefreshIcon width={18} height={18} />
          </motion.span>
        </motion.span>
      </motion.div>

      <motion.div
        ref={paneRef}
        className={`scroll-pane h-full ${className ?? ""}`}
        style={{ y: pull }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
