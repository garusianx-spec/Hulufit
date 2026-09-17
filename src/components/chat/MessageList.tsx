"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { faDayLabel } from "@/lib/format";
import type { ChatMessage } from "@/types";

/**
 * Virtual-free transcript (threads are short by design). Handles:
 *  · day separators
 *  · stick-to-bottom on new messages, but not while reading history
 *  · top-sentinel that pulls the next REST page
 */
export function MessageList({
  messages,
  typing,
  coachName,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onRetry,
  perspective = "client",
}: {
  messages: ChatMessage[];
  typing: boolean;
  coachName: string;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetry: (id: string) => void;
  perspective?: "client" | "specialist";
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevHeight = useRef(0);
  const prevCount = useRef(messages.length);

  // Infinite history: fetch when the top sentinel scrolls into view.
  useEffect(() => {
    const pane = paneRef.current;
    const sentinel = sentinelRef.current;
    if (!pane || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingOlder) onLoadOlder();
      },
      { root: pane, rootMargin: "120px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingOlder, onLoadOlder]);

  // Keep the reading position pinned when an older page is prepended.
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const grew = messages.length > prevCount.current;
    const prependedCount = messages.length - prevCount.current;
    const appended = grew && messages[messages.length - 1] !== undefined;

    if (grew && prependedCount > 1 && prevHeight.current > 0) {
      // A history page landed above the viewport.
      pane.scrollTop += pane.scrollHeight - prevHeight.current;
    } else if (appended) {
      pane.scrollTo({ top: pane.scrollHeight, behavior: prevCount.current === 0 ? "auto" : "smooth" });
    }

    prevHeight.current = pane.scrollHeight;
    prevCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const pane = paneRef.current;
    if (pane && typing) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [typing]);

  let lastDay = "";

  return (
    <div ref={paneRef} className="scroll-pane flex-1 px-3 py-3">
      <div ref={sentinelRef} />

      {hasMore && (
        <div className="flex justify-center py-2">
          {loadingOlder ? (
            <span className="rounded-pill bg-canvas px-3 py-1.5 text-2xs text-ink-muted">
              در حال بارگذاری پیام‌های قبلی…
            </span>
          ) : (
            <button
              type="button"
              onClick={onLoadOlder}
              className="rounded-pill border border-line bg-surface px-3 py-1.5 text-2xs font-bold text-ink-muted"
            >
              نمایش پیام‌های قدیمی‌تر
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {messages.map((message) => {
          const day = faDayLabel(message.createdAt);
          const showSeparator = day !== lastDay;
          lastDay = day;

          return (
            <div key={message.id} className="flex flex-col gap-2.5">
              {showSeparator && (
                <div className="my-1 flex justify-center">
                  <span className="rounded-pill bg-canvas px-3 py-1 text-[0.6rem] font-bold text-ink-muted">
                    {day}
                  </span>
                </div>
              )}
              <MessageBubble message={message} onRetry={onRetry} perspective={perspective} />
            </div>
          );
        })}

        <AnimatePresence>
          {typing && (
            <motion.div key="typing" layout>
              <TypingIndicator name={coachName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
