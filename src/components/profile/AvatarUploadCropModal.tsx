"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ProgressBar, Sep } from "@/components/ui/Bits";
import { CameraIcon, ImageIcon, RefreshIcon, TrashIcon } from "@/components/ui/Icons";
import { AVATAR_ACCEPT_ATTR, AVATAR_MAX_BYTES, guardFile } from "@/lib/upload/fileGuards";
import { cropToBlob, loadImage } from "@/lib/image/cropCanvas";
import { cx, faFileSize, faNumber } from "@/lib/format";

type Stage = "pick" | "crop" | "saving";

const CROP_BOX = 264;

interface Props {
  open: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  onSave: (dataUrl: string) => void;
  onRemove: () => void;
}

/**
 * Profile avatar manager: pick → client-side preview → pan/zoom crop →
 * canvas encode → upload with progress → save. Also handles removal.
 *
 * Nothing leaves the device until the user confirms, and the image is
 * downscaled to 512×512 JPEG first, so a 6 MB camera shot uploads as ~80 KB.
 */
export function AvatarUploadCropModal({ open, onClose, currentAvatar, onSave, onRemove }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [source, setSource] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [progress, setProgress] = useState(0);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);

  const baseScale = natural.width
    ? CROP_BOX / Math.min(natural.width, natural.height)
    : 1;
  const displayWidth = natural.width * baseScale * zoom;
  const displayHeight = natural.height * baseScale * zoom;

  const revoke = useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }, []);

  useEffect(() => revoke, [revoke]);

  const reset = useCallback(() => {
    revoke();
    setStage("pick");
    setSource(null);
    setNatural({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setProgress(0);
    setFileMeta(null);
  }, [revoke]);

  const close = () => {
    reset();
    onClose();
  };

  /** Guard → object URL → decode → centre the crop window. */
  const handlePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const verdict = guardFile(file, { maxBytes: AVATAR_MAX_BYTES, allow: ["image"] });
    if (!verdict.ok) {
      toast.error(verdict.message);
      return;
    }

    revoke();
    const url = URL.createObjectURL(file);
    objectUrl.current = url;

    try {
      const img = await loadImage(url);
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      const scale = CROP_BOX / Math.min(img.naturalWidth, img.naturalHeight);
      setOffset({
        x: (CROP_BOX - img.naturalWidth * scale) / 2,
        y: (CROP_BOX - img.naturalHeight * scale) / 2,
      });
      setZoom(1);
      setSource(url);
      setFileMeta({ name: file.name, size: file.size });
      setStage("crop");
    } catch {
      revoke();
      toast.error("این تصویر قابل خواندن نیست. فایل دیگری انتخاب کنید.");
    }
  };

  /** Keeps the image covering the crop window after a drag or zoom change. */
  const clampOffset = useCallback(
    (next: { x: number; y: number }, w = displayWidth, h = displayHeight) => ({
      x: Math.min(0, Math.max(CROP_BOX - w, next.x)),
      y: Math.min(0, Math.max(CROP_BOX - h, next.y)),
    }),
    [displayHeight, displayWidth],
  );

  const changeZoom = (nextZoom: number) => {
    const w = natural.width * baseScale * nextZoom;
    const h = natural.height * baseScale * nextZoom;
    // Zoom around the centre of the crop window.
    const cx = CROP_BOX / 2 - ((CROP_BOX / 2 - offset.x) / displayWidth) * w;
    const cy = CROP_BOX / 2 - ((CROP_BOX / 2 - offset.y) / displayHeight) * h;
    setZoom(nextZoom);
    setOffset(clampOffset({ x: cx, y: cy }, w, h));
  };

  const save = async () => {
    if (!source) return;
    setStage("saving");
    setProgress(0);

    try {
      const scale = baseScale * zoom;
      const { blob, dataUrl } = await cropToBlob(
        source,
        {
          x: -offset.x / scale / natural.width,
          y: -offset.y / scale / natural.height,
          size: CROP_BOX / scale / Math.min(natural.width, natural.height),
        },
        { outputSize: 512, mime: "image/jpeg", quality: 0.9 },
      );

      // Production: PUT the blob to /api/profile/avatar with an upload
      // progress listener; the mock steps the same bar.
      for (let p = 10; p <= 100; p += 18) {
        await new Promise((r) => setTimeout(r, 110));
        setProgress(Math.min(100, p));
      }

      onSave(dataUrl);
      toast.success(`تصویر پروفایل به‌روزرسانی شد (${faFileSize(blob.size)}).`);
      close();
    } catch {
      setStage("crop");
      toast.error("ذخیره تصویر ناموفق بود. دوباره تلاش کنید.");
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept={AVATAR_ACCEPT_ATTR} onChange={handlePick} className="hidden" />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handlePick}
        className="hidden"
      />

      <Sheet
        open={open}
        onClose={close}
        title="تصویر پروفایل"
        subtitle={
          stage === "crop"
            ? "با کشیدن و بزرگ‌نمایی، کادر را تنظیم کنید"
            : `تصویر واضح از چهره — حداکثر ${faFileSize(AVATAR_MAX_BYTES)}`
        }
        maxHeight="92vh"
        footer={
          stage === "crop" || stage === "saving" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={stage === "saving"}
                className="app-btn-ghost shrink-0 whitespace-nowrap px-4 disabled:opacity-40"
              >
                <RefreshIcon width={16} height={16} />
                تصویر دیگر
              </button>
              <button
                type="button"
                onClick={save}
                disabled={stage === "saving"}
                className="app-btn-primary flex-1 whitespace-nowrap disabled:opacity-60"
              >
                {stage === "saving" ? "در حال ذخیره…" : "ذخیره تصویر"}
              </button>
            </div>
          ) : undefined
        }
      >
        {stage === "pick" ? (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex justify-center py-3">
              <span className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-line bg-canvas">
                {currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt="تصویر فعلی" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon width={30} height={30} className="text-ink-soft" />
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 active:scale-[0.97]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-pill bg-primary-50 text-primary-700">
                  <CameraIcon width={22} height={22} />
                </span>
                <span className="text-xs font-bold text-ink">دوربین</span>
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 active:scale-[0.97]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-pill bg-sky-50 text-sky-700">
                  <ImageIcon width={22} height={22} />
                </span>
                <span className="text-xs font-bold text-ink">انتخاب از گالری</span>
              </button>
            </div>

            {currentAvatar && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  toast.show("تصویر پروفایل حذف شد.");
                  close();
                }}
                className="app-btn w-full border border-danger-100 bg-danger-50 text-danger-600"
              >
                <TrashIcon width={17} height={17} />
                حذف تصویر فعلی
              </button>
            )}

            <p className="rounded-card bg-canvas px-3 py-2.5 text-2xs leading-5 text-ink-muted">
              تصویر پیش از ارسال روی دستگاه شما برش خورده و به ابعاد ۵۱۲×۵۱۲ فشرده می‌شود؛ بنابراین حجم
              اینترنت کمی مصرف می‌کند.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3.5 pb-2">
            {/* Crop viewport */}
            <div
              className="relative overflow-hidden rounded-card bg-ink/90"
              style={{ width: CROP_BOX, height: CROP_BOX, touchAction: "none" }}
            >
              {source && (
                <motion.img
                  src={source}
                  alt="پیش‌نمایش"
                  draggable={false}
                  className="absolute select-none"
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                    x: offset.x,
                    y: offset.y,
                  }}
                  drag={stage === "crop"}
                  dragMomentum={false}
                  dragElastic={0}
                  dragConstraints={{
                    left: CROP_BOX - displayWidth,
                    right: 0,
                    top: CROP_BOX - displayHeight,
                    bottom: 0,
                  }}
                  onDragEnd={(_, info) =>
                    setOffset((prev) => clampOffset({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))
                  }
                />
              )}

              {/* Circular mask + rule-of-thirds guides */}
              <div className="pointer-events-none absolute inset-0">
                <svg className="h-full w-full" viewBox={`0 0 ${CROP_BOX} ${CROP_BOX}`}>
                  <defs>
                    <mask id="avatar-mask">
                      <rect width={CROP_BOX} height={CROP_BOX} fill="white" />
                      <circle cx={CROP_BOX / 2} cy={CROP_BOX / 2} r={CROP_BOX / 2 - 8} fill="black" />
                    </mask>
                  </defs>
                  <rect width={CROP_BOX} height={CROP_BOX} fill="rgba(15,23,42,0.55)" mask="url(#avatar-mask)" />
                  <circle
                    cx={CROP_BOX / 2}
                    cy={CROP_BOX / 2}
                    r={CROP_BOX / 2 - 8}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>

            {/* Zoom */}
            <div className="flex w-full items-center gap-3 px-1">
              <span className="text-2xs text-ink-muted">بزرگ‌نمایی</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                disabled={stage === "saving"}
                onChange={(e) => changeZoom(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-pill bg-line accent-primary-600"
                aria-label="بزرگ‌نمایی تصویر"
              />
              <span dir="ltr" className="w-10 text-left text-2xs font-bold tabular-nums text-ink">
                {faNumber(zoom, 1)}×
              </span>
            </div>

            {fileMeta && (
              <p className="w-full truncate rounded-card bg-canvas px-3 py-2 text-2xs text-ink-muted">
                {fileMeta.name}
                <Sep />
                {faFileSize(fileMeta.size)}
              </p>
            )}

            {stage === "saving" && (
              <div className="w-full">
                <ProgressBar value={progress} height={7} />
                <p className={cx("mt-1.5 text-center text-2xs font-bold text-primary-700")}>
                  در حال آپلود… {faNumber(progress)}٪
                </p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
