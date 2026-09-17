"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { CameraIcon, FileIcon, ImageIcon, LabIcon, MicIcon, PaperclipIcon, SendIcon } from "@/components/ui/Icons";
import { ACCEPTED_MIME, CHAT_ACCEPT_ATTR, MAX_ATTACHMENT_LABEL } from "@/lib/upload/fileGuards";
import { cx, faDuration } from "@/lib/format";
import { quickReplies } from "@/lib/mock/chat";

interface Props {
  onSendText: (text: string) => void;
  onPickFiles: (files: FileList | File[]) => void;
  onTyping: () => void;
  disabled?: boolean;
  showQuickReplies?: boolean;
}

/** Text input + attachment picker + voice recorder, safe-area aware. */
export function Composer({ onSendText, onPickFiles, onTyping, disabled, showQuickReplies }: Props) {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);

  // Auto-grow the textarea up to five lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const submit = () => {
    if (!text.trim()) return;
    onSendText(text);
    setText("");
  };

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) onPickFiles(event.target.files);
    // Reset so re-picking the same file still fires a change event.
    event.target.value = "";
    setPickerOpen(false);
  };

  const stopRecording = (send: boolean) => {
    setRecording(false);
    if (send && recordSeconds > 0) {
      // Production: hand the MediaRecorder blob straight to the upload queue.
      const blob = new Blob([new Uint8Array(recordSeconds * 8000)], { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      onPickFiles([file]);
    }
    setRecordSeconds(0);
  };

  return (
    <>
      {showQuickReplies && !text && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line bg-canvas px-3 py-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onSendText(reply)}
              className="app-chip shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line bg-surface px-3 pb-[calc(0.6rem+var(--safe-bottom))] pt-2.5">
        <AnimatePresence mode="wait" initial={false}>
          {recording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-3 rounded-pill border border-danger-100 bg-danger-50 px-3 py-2"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="h-2.5 w-2.5 rounded-full bg-danger-500"
              />
              <span className="text-xs font-bold tabular-nums text-danger-600">
                {faDuration(recordSeconds)}
              </span>
              <span className="flex-1 text-2xs text-ink-muted">در حال ضبط پیام صوتی…</span>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="rounded-pill px-3 py-1 text-2xs font-bold text-ink-muted"
              >
                لغو
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="rounded-pill bg-primary-600 px-3 py-1.5 text-2xs font-bold text-white"
              >
                ارسال
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="composer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-end gap-2"
            >
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={disabled}
                aria-label="پیوست فایل"
                className="tap-target grid h-10 w-10 shrink-0 place-items-center rounded-pill border border-line text-ink-muted transition-colors active:bg-canvas disabled:opacity-40"
              >
                <PaperclipIcon width={19} height={19} />
              </button>

              <div className="flex flex-1 items-end rounded-[1.4rem] border border-line bg-canvas px-3 py-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  disabled={disabled}
                  onChange={(e) => {
                    setText(e.target.value);
                    onTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="پیام خود را بنویسید…"
                  className="max-h-[120px] w-full resize-none bg-transparent text-xs leading-6 text-ink outline-none placeholder:text-ink-soft"
                />
              </div>

              {text.trim() ? (
                <motion.button
                  key="send"
                  type="button"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={submit}
                  aria-label="ارسال پیام"
                  className="tap-target grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-primary-600 text-white shadow-float active:scale-95"
                >
                  <SendIcon width={19} height={19} />
                </motion.button>
              ) : (
                <button
                  key="mic"
                  type="button"
                  onClick={() => setRecording(true)}
                  disabled={disabled}
                  aria-label="ضبط پیام صوتی"
                  className="tap-target grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-primary-600 text-white shadow-float active:scale-95 disabled:opacity-40"
                >
                  <MicIcon width={19} height={19} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden inputs — `accept` is the first of three size/type gates. */}
      <input
        ref={galleryRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME.image.join(",")}
        onChange={handlePick}
        className="hidden"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePick}
        className="hidden"
      />
      <input
        ref={documentRef}
        type="file"
        multiple
        accept={CHAT_ACCEPT_ATTR}
        onChange={handlePick}
        className="hidden"
      />

      <Sheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="ارسال فایل"
        subtitle={`حداکثر حجم هر فایل ${MAX_ATTACHMENT_LABEL}`}
      >
        <div className="grid grid-cols-2 gap-2.5 pb-3">
          <PickerTile
            icon={<LabIcon width={22} height={22} />}
            label="جواب آزمایش"
            hint="PDF یا عکس"
            tone="sky"
            onClick={() => documentRef.current?.click()}
          />
          <PickerTile
            icon={<CameraIcon width={22} height={22} />}
            label="عکس بدن"
            hint="دوربین"
            tone="primary"
            onClick={() => cameraRef.current?.click()}
          />
          <PickerTile
            icon={<ImageIcon width={22} height={22} />}
            label="گالری"
            hint="تصاویر"
            tone="primary"
            onClick={() => galleryRef.current?.click()}
          />
          <PickerTile
            icon={<FileIcon width={22} height={22} />}
            label="سند"
            hint="PDF برنامه"
            tone="warn"
            onClick={() => documentRef.current?.click()}
          />
        </div>
        <p className="rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
          فایل‌های بزرگ‌تر از {MAX_ATTACHMENT_LABEL} پیش از شروع آپلود رد می‌شوند تا حجم اینترنت شما مصرف نشود.
        </p>
      </Sheet>
    </>
  );
}

function PickerTile({
  icon,
  label,
  hint,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: "primary" | "sky" | "warn";
  onClick: () => void;
}) {
  const style = {
    primary: "bg-primary-50 text-primary-700",
    sky: "bg-sky-50 text-sky-700",
    warn: "bg-warn-50 text-warn-600",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 transition-transform active:scale-[0.97]"
    >
      <span className={cx("grid h-12 w-12 place-items-center rounded-pill", style)}>{icon}</span>
      <span className="text-xs font-bold text-ink">{label}</span>
      <span className="text-[0.6rem] text-ink-muted">{hint}</span>
    </button>
  );
}
