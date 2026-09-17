"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/format";
import { CloseIcon } from "./Icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** "sheet" slides from the bottom (mobile default); "modal" scales in center. */
  variant?: "sheet" | "modal";
  maxHeight?: string;
  footer?: ReactNode;
}

/** Bottom sheet / modal with backdrop, scroll-lock and safe-area padding. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  variant = "sheet",
  maxHeight = "85vh",
  footer,
}: SheetProps) {
  // Sheets render through a portal on <body>.
  //
  // `position: fixed` resolves against the nearest ancestor with a transform,
  // filter, backdrop-filter or containment — and the app header has
  // `backdrop-blur`. A sheet opened from the header would otherwise be
  // clipped to the header's box instead of covering the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(
              "relative w-full bg-surface shadow-sheet",
              variant === "sheet"
                ? "rounded-t-sheet max-w-[520px]"
                : "m-4 max-w-[420px] rounded-sheet",
            )}
            style={{ maxHeight }}
            initial={variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.94 }}
            animate={variant === "sheet" ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag={variant === "sheet" ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            {variant === "sheet" && (
              <div className="flex justify-center pt-3">
                <span className="h-1.5 w-11 rounded-pill bg-line" />
              </div>
            )}

            {(title || subtitle) && (
              <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
                <div className="min-w-0">
                  {title && <h2 className="truncate text-base font-extrabold text-ink">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن"
                  className="tap-target -m-2 grid place-items-center rounded-pill p-2 text-ink-soft transition-colors active:bg-canvas"
                >
                  <CloseIcon width={20} height={20} />
                </button>
              </header>
            )}

            <div
              className="scroll-pane px-5 pb-4"
              style={{ maxHeight: `calc(${maxHeight} - ${footer ? "10rem" : "5rem"})` }}
            >
              {children}
            </div>

            {footer && (
              <div className="border-t border-line bg-surface px-5 pb-[calc(1rem+var(--safe-bottom))] pt-3">
                {footer}
              </div>
            )}
            {!footer && variant === "sheet" && <div className="pb-[var(--safe-bottom)]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
