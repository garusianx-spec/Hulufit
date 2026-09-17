"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ProgressBar } from "@/components/ui/Bits";
import { CloseIcon, FileIcon, MicIcon, RefreshIcon } from "@/components/ui/Icons";
import { cx, faFileSize, faNumber } from "@/lib/format";
import type { UploadTask } from "@/types";

/**
 * Live upload queue above the composer: thumbnail, name, size, percentage,
 * transfer speed, cancel and retry. Sits between the 30 MB guard and send.
 */
export function UploadTray({
  tasks,
  onCancel,
  onRetry,
  onRemove,
}: {
  tasks: UploadTask[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="border-t border-line bg-canvas px-3 py-2">
      <AnimatePresence initial={false}>
        {tasks.map((task) => {
          const failed = task.status === "error";
          const finished = task.status === "done";
          const speedKb = task.speedBps / 1024;

          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-1.5 flex items-center gap-2.5 rounded-card border border-line bg-surface p-2">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-card bg-canvas text-ink-muted">
                  {task.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={task.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : task.kind === "audio" ? (
                    <MicIcon width={17} height={17} />
                  ) : (
                    <FileIcon width={17} height={17} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-2xs font-bold text-ink">{task.file.name}</p>
                    <p
                      className={cx(
                        "shrink-0 text-[0.6rem] font-extrabold tabular-nums",
                        failed ? "text-danger-600" : finished ? "text-primary-700" : "text-ink-muted",
                      )}
                    >
                      {failed ? "خطا" : finished ? "آماده ارسال" : `${faNumber(task.progress)}٪`}
                    </p>
                  </div>

                  <ProgressBar
                    value={task.progress}
                    tone={failed ? "danger" : finished ? "primary" : "sky"}
                    height={5}
                    className="mt-1.5"
                  />

                  <p className="mt-1 text-[0.6rem] text-ink-soft">
                    {failed
                      ? task.error
                      : `${faFileSize(task.bytesSent)} از ${faFileSize(task.file.size)}${
                          !finished && speedKb > 0 ? ` — ${faNumber(speedKb)} کیلوبایت بر ثانیه` : ""
                        }`}
                  </p>
                </div>

                {failed ? (
                  <button
                    type="button"
                    onClick={() => onRetry(task.id)}
                    aria-label="تلاش مجدد"
                    className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-danger-50 text-danger-600"
                  >
                    <RefreshIcon width={15} height={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => (finished ? onRemove(task.id) : onCancel(task.id))}
                    aria-label={finished ? "حذف" : "لغو ارسال"}
                    className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-canvas text-ink-muted"
                  >
                    <CloseIcon width={15} height={15} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
