"use client";

import { motion } from "framer-motion";

/** Three-dot bubble shown while the coach types. */
export function TypingIndicator({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      className="flex items-end gap-2"
    >
      <div className="flex items-center gap-1 rounded-card rounded-br-sm border border-line bg-surface px-3.5 py-3 shadow-card">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ink-soft animate-pulse-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="pb-1 text-[0.6rem] text-ink-soft">{name} در حال نوشتن است</span>
    </motion.div>
  );
}
