"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sep } from "@/components/ui/Bits";
import { FileIcon, LabIcon, MicIcon, PauseIcon, PlayIcon } from "@/components/ui/Icons";
import { cx, faDuration, faFileSize } from "@/lib/format";
import type { Attachment } from "@/types";

/** Renders one attachment inside a message bubble, by kind. */
export function AttachmentView({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  switch (attachment.kind) {
    case "image":
      return <ImageAttachment attachment={attachment} />;
    case "audio":
      return <VoiceNote attachment={attachment} mine={mine} />;
    case "lab":
    case "pdf":
    default:
      return <DocumentAttachment attachment={attachment} mine={mine} />;
  }
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-card bg-canvas" style={{ maxWidth: 212 }}>
      {!loaded && <div className="h-40 w-52 animate-pulse bg-line/70" />}
      {/* Blob/object URLs — next/image would only get in the way. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.url}
        alt={attachment.name}
        onLoad={() => setLoaded(true)}
        className={cx("block max-h-56 w-full object-cover transition-opacity", loaded ? "opacity-100" : "absolute opacity-0")}
      />
      <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-ink/60 px-2 py-0.5 text-[0.55rem] font-medium text-white backdrop-blur">
        {faFileSize(attachment.sizeBytes)}
      </span>
    </div>
  );
}

function DocumentAttachment({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const isLab = attachment.kind === "lab";
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "flex items-center gap-2.5 rounded-card border p-2.5 transition-colors",
        mine ? "border-white/25 bg-white/10" : "border-line bg-canvas",
      )}
      style={{ maxWidth: 248 }}
    >
      <span
        className={cx(
          "grid h-10 w-10 shrink-0 place-items-center rounded-card",
          mine ? "bg-white/20 text-white" : isLab ? "bg-sky-50 text-sky-600" : "bg-danger-50 text-danger-600",
        )}
      >
        {isLab ? <LabIcon width={19} height={19} /> : <FileIcon width={19} height={19} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block truncate text-2xs font-bold", mine ? "text-white" : "text-ink")}>
          {attachment.name}
        </span>
        <span className={cx("mt-0.5 block text-[0.6rem]", mine ? "text-white/70" : "text-ink-muted")}>
          {isLab ? "آزمایش" : "PDF"}
          <Sep />
          {faFileSize(attachment.sizeBytes)}
        </span>
      </span>
    </a>
  );
}

function VoiceNote({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = attachment.durationSec ?? 0;

  useEffect(() => {
    if (!playing) return;
    // Real playback drives this from `timeupdate`; the mock ticks a timer so
    // the waveform scrubs even without decodable bytes.
    const interval = setInterval(() => {
      setElapsed((e) => {
        if (e + 0.25 >= total) {
          setPlaying(false);
          return 0;
        }
        return e + 0.25;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [playing, total]);

  const progress = total ? elapsed / total : 0;
  const bars = 28;

  return (
    <div
      className={cx(
        "flex items-center gap-2.5 rounded-card border p-2.5",
        mine ? "border-white/25 bg-white/10" : "border-line bg-canvas",
      )}
      style={{ minWidth: 216 }}
    >
      <audio ref={audioRef} src={attachment.url} preload="none" />
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "توقف" : "پخش پیام صوتی"}
        className={cx(
          "tap-target grid h-9 w-9 shrink-0 place-items-center rounded-pill",
          mine ? "bg-white text-primary-700" : "bg-primary-600 text-white",
        )}
      >
        {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      </button>

      <div className="flex flex-1 items-center gap-[2px]" aria-hidden="true">
        {Array.from({ length: bars }).map((_, i) => {
          const height = 5 + ((i * 7) % 13);
          const active = i / bars <= progress;
          return (
            <motion.span
              key={i}
              className="w-[2.5px] rounded-pill"
              style={{ height }}
              animate={{
                backgroundColor: active
                  ? mine
                    ? "#FFFFFF"
                    : "#059669"
                  : mine
                    ? "rgba(255,255,255,0.35)"
                    : "#CBD5E1",
              }}
              transition={{ duration: 0.12 }}
            />
          );
        })}
      </div>

      <span
        className={cx("shrink-0 text-[0.6rem] tabular-nums", mine ? "text-white/80" : "text-ink-muted")}
      >
        {faDuration(playing ? elapsed : total)}
      </span>
      <MicIcon width={13} height={13} className={mine ? "text-white/60" : "text-ink-soft"} />
    </div>
  );
}
