"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Bits";
import { ChevronRight } from "@/components/ui/Icons";
import { cx } from "@/lib/format";
import type { ChatThread } from "@/types";
import type { SocketState } from "@/lib/ws/mockSocket";

/** Coach identity + live connection/presence state. */
export function ChatHeader({
  thread,
  connectionLabel,
  state,
  typing,
}: {
  thread: ChatThread;
  connectionLabel: string;
  state: SocketState;
  typing: boolean;
}) {
  const router = useRouter();
  const live = state === "open";

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-surface/95 pt-[var(--safe-top)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-h)] max-w-[520px] items-center gap-2.5 px-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="بازگشت"
          className="tap-target -mr-2 grid place-items-center rounded-pill p-2 text-ink active:bg-canvas"
        >
          <ChevronRight width={22} height={22} />
        </button>

        <div className="relative">
          <Avatar src={thread.avatarUrl} name={thread.specialistName} size={38} />
          <span
            className={cx(
              "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full ring-2 ring-surface transition-colors",
              live && thread.online ? "bg-primary-500" : "bg-slate-300",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">{thread.specialistName}</p>
          <p className="flex h-4 items-center gap-1 text-2xs">
            {typing ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-primary-700"
              >
                در حال نوشتن…
              </motion.span>
            ) : (
              <span className={cx(live ? "text-primary-700" : "text-ink-muted")}>{connectionLabel}</span>
            )}
          </p>
        </div>

        <span className="shrink-0 rounded-pill bg-canvas px-2.5 py-1 text-2xs font-bold text-ink-muted">
          {thread.specialistTitle}
        </span>
      </div>
    </header>
  );
}
