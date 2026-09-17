/** Canvas helpers behind the avatar crop modal. */

export interface CropRect {
  /** Normalised 0..1 coordinates relative to the natural image size. */
  x: number;
  y: number;
  size: number;
}

export interface CropOptions {
  outputSize?: number;
  mime?: "image/jpeg" | "image/webp" | "image/png";
  quality?: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-decode-failed"));
    img.src = src;
  });
}

/**
 * Renders the selected square region to an off-screen canvas and returns a
 * compressed blob. Down-scaling here is what keeps a 10 MB camera photo from
 * ever reaching the network as an avatar.
 */
export async function cropToBlob(
  src: string,
  rect: CropRect,
  { outputSize = 512, mime = "image/jpeg", quality = 0.9 }: CropOptions = {},
): Promise<{ blob: Blob; dataUrl: string }> {
  const img = await loadImage(src);
  const sx = rect.x * img.naturalWidth;
  const sy = rect.y * img.naturalHeight;
  const sSize = rect.size * Math.min(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);

  const dataUrl = canvas.toDataURL(mime, quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas-encode-failed"))), mime, quality);
  });

  return { blob, dataUrl };
}

/** Clamps a pan/zoom gesture so the crop window never leaves the image. */
export function clampRect(rect: CropRect): CropRect {
  const size = Math.min(1, Math.max(0.2, rect.size));
  return {
    size,
    x: Math.min(1 - size, Math.max(0, rect.x)),
    y: Math.min(1 - size, Math.max(0, rect.y)),
  };
}
