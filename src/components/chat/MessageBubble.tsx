"use client";

import { motion } from "framer-motion";
import { AttachmentView } from "./Attachments";
import { CheckIcon, ClockIcon, RefreshIcon } from "@/components/ui/Icons";
import { cx, faTime } from "@/lib/format";
import type { ChatMessage } from "@/types";

/** One transcript row: bubble, attachment, timestamp and delivery state. */
export function MessageBubble({
  message,
  onRetry,
  perspective = "client",
}: {
  message: ChatMessage;
  onRetry?: (id: string) => void;
  /** Which author sits on the outgoing side — flipped in the specialist portal. */
  perspective?: "client" | "specialist";
}) {
  const mine = message.author === (perspective === "client" ? "me" : "coach");
  const attachmentOnly = Boolean(message.attachment) && !message.text;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      /* RTL mirror of the usual chat layout: mine sits on the left. */
      className={cx("flex w-full", mine ? "justify-end" : "justify-start")}
    >
      <div className={cx("flex max-w-[86%] flex-col gap-1", mine ? "items-end" : "items-start")}>
        <div
          className={cx(
            "overflow-hidden shadow-card",
            attachmentOnly ? "rounded-card p-1.5" : "rounded-card px-3.5 py-2.5",
            mine
              ? "rounded-bl-sm bg-primary-600 text-white"
              : "rounded-br-sm border border-line bg-surface text-ink",
          )}
        >
          {message.replyTo && (
            <div
              className={cx(
                "mb-1.5 rounded-lg border-r-2 px-2 py-1 text-[0.6rem] leading-4",
                mine ? "border-white/60 bg-white/10 text-white/80" : "border-primary-500 bg-canvas text-ink-muted",
              )}
            >
              {message.replyTo.preview}
            </div>
          )}

          {message.attachment && (
            <div className={message.text ? "mb-2" : undefined}>
              <AttachmentView attachment={message.attachment} mine={mine} />
            </div>
          )}

          {message.text && (
            <p className={cx("whitespace-pre-wrap text-xs leading-6", attachmentOnly && "px-2 pb-1")}>
              {message.text}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 px-1">
          <span className="text-[0.6rem] text-ink-soft">{faTime(message.createdAt)}</span>
          {mine && <StatusTicks status={message.status} onRetry={() => onRetry?.(message.id)} />}
        </div>
      </div>
    </motion.div>
  );
}

/** Read receipts: ⏱ queued · ✓ sent · ✓✓ delivered · ✓✓ (green) read. */
function StatusTicks({
  status,
  onRetry,
}: {
  status: ChatMessage["status"];
  onRetry: () => void;
}) {
  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-0.5 text-[0.6rem] font-bold text-danger-600"
      >
        <RefreshIcon width={11} height={11} />
        ارسال مجدد
      </button>
    );
  }

  if (status === "queued" || status === "sending") {
    return (
      <span aria-label="در حال ارسال" className="text-ink-soft">
        <ClockIcon width={11} height={11} />
      </span>
    );
  }

  const isRead = status === "read";
  const isDouble = status === "delivered" || isRead;

  return (
    <span
      aria-label={isRead ? "خوانده شد" : isDouble ? "تحویل شد" : "ارسال شد"}
      className={cx("relative inline-flex", isRead ? "text-primary-600" : "text-ink-soft")}
    >
      <CheckIcon width={12} height={12} strokeWidth={2.6} />
      {isDouble && (
        <CheckIcon width={12} height={12} strokeWidth={2.6} className="-mr-[7px]" />
      )}
    </span>
  );
}
