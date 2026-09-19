"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cx, toFa } from "@/lib/format";
import { digitsOnly } from "../lib/phone";

/**
 * Five single-character boxes.
 *
 * The row is `dir="ltr"` on purpose: a number reads left-to-right even inside
 * Persian text, so the first digit typed belongs in the leftmost box. The boxes
 * show Persian digits while the value they report is always ASCII.
 */
export function OtpInput({
  value,
  length,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
}: {
  value: string;
  length: number;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const cells = Array.from({ length }, (_, i) => value[i] ?? "");

  // The keypad should be waiting the moment the step appears.
  useEffect(() => {
    if (!disabled) boxes.current[0]?.focus();
  }, [disabled]);

  const focusBox = (index: number) => {
    const target = boxes.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    onChange(trimmed);
    if (trimmed.length === length) onComplete?.(trimmed);
  };

  const handleInput = (index: number, raw: string) => {
    const typed = digitsOnly(raw);
    if (!typed) {
      // A cleared box is a deletion, not a no-op.
      if (raw === "") commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }

    // Typing over a filled box replaces it; a multi-digit paste spills forward.
    const head = value.slice(0, index);
    const tail = value.slice(index + typed.length);
    const next = (head + typed + tail).slice(0, length);
    commit(next);
    focusBox(index + typed.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !cells[index]) {
      event.preventDefault();
      commit(value.slice(0, Math.max(0, index - 1)));
      focusBox(index - 1);
      return;
    }
    // Arrows follow the visual row, which is LTR here.
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = digitsOnly(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    commit(pasted);
    focusBox(Math.min(pasted.length, length - 1));
  };

  return (
    <motion.div
      dir="ltr"
      className="flex justify-center gap-2.5"
      // A wrong code is felt before it is read.
      animate={invalid ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {cells.map((cell, index) => (
        <input
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          value={cell ? toFa(cell) : ""}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // `tel` keeps iOS on a numeric keypad without a spinner.
          type="tel"
          maxLength={length}
          aria-label={`رقم ${toFa(index + 1)} از ${toFa(length)}`}
          className={cx(
            "h-14 w-12 rounded-2xl border bg-surface text-center text-2xl font-bold tabular-nums",
            "text-ink shadow-sm outline-none transition",
            "focus:border-primary-600 focus:ring-4 focus:ring-primary-600/12",
            "disabled:bg-canvas disabled:text-ink-soft",
            invalid ? "border-danger-500 text-danger-600" : "border-line",
          )}
        />
      ))}
    </motion.div>
  );
}
