/**
 * Generates every PNG the manifest references, with no image dependencies.
 *
 *   node scripts/generate-icons.mjs
 *
 * The mark matches src/components/layout/Logo.tsx: a white leaf on the
 * emerald→sky brand gradient, plus a pulse line. Maskable variants keep the
 * art inside Android's 80% safe zone; the monochrome variant is a flat glyph.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

/* ------------------------------ PNG encoder ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** rgba: Uint8Array of width*height*4 */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy
      ? rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
      : Buffer.from(rgba.subarray(y * width * 4, (y + 1) * width * 4)).copy(
          raw,
          y * (width * 4 + 1) + 1,
        );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------- Geometry -------------------------------- */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Rounded-rect signed coverage at a point. */
function inRoundedRect(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Leaf = intersection of two circles (a vesica), rotated 45°.
 * Coordinates are normalised to the icon's art box.
 */
function inLeaf(nx, ny) {
  const a = -Math.PI / 4;
  const x = nx * Math.cos(a) - ny * Math.sin(a);
  const y = nx * Math.sin(a) + ny * Math.cos(a);
  const r = 0.62;
  const d1 = Math.hypot(x + 0.3, y) <= r;
  const d2 = Math.hypot(x - 0.3, y) <= r;
  return d1 && d2;
}

/** Diagonal stem line through the leaf. */
function onStem(nx, ny) {
  // Line y = x, from (-0.45,-0.45) to (0.42,0.42), thickness ~0.055
  const dist = Math.abs(nx - ny) / Math.SQRT2;
  const along = (nx + ny) / 2;
  return dist < 0.032 && along > -0.42 && along < 0.4;
}

/** Small ECG pulse under the leaf. */
function onPulse(nx, ny) {
  const pts = [
    [-0.86, 0.76],
    [-0.58, 0.76],
    [-0.46, 0.56],
    [-0.28, 0.94],
    [-0.12, 0.66],
    [0.12, 0.66],
  ];
  const t = 0.035;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const u = clamp01(((nx - x1) * dx + (ny - y1) * dy) / len2);
    const px = x1 + u * dx;
    const py = y1 + u * dy;
    if (Math.hypot(nx - px, ny - py) < t) return true;
  }
  return false;
}

/* -------------------------------- Renderer -------------------------------- */

const SS = 3; // supersampling factor

function render(size, { maskable = false, monochrome = false, glyphOnly = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? size / 2 : size * 0.22;
  // Maskable icons keep the art inside the 80% safe zone.
  const artScale = maskable ? 0.58 : 0.74;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          const inside = maskable ? true : inRoundedRect(px, py, size, radius);
          if (!inside) continue;

          // Normalised art coordinates in [-1, 1].
          const nx = ((px - size / 2) / (size / 2)) / artScale;
          const ny = ((py - size / 2) / (size / 2)) / artScale;

          const leaf = inLeaf(nx, ny);
          // The stem is a vein inside the leaf, never a slash across the tile.
          const stem = leaf && onStem(nx, ny);
          const pulse = !leaf && onPulse(nx, ny);

          let pr;
          let pg;
          let pb;
          let pa = 1;

          if (monochrome) {
            if (leaf || pulse) {
              pr = pg = pb = 255;
            } else {
              pa = 0;
              pr = pg = pb = 0;
            }
          } else if (glyphOnly) {
            if (leaf || pulse) {
              pr = 5;
              pg = 150;
              pb = 105;
            } else {
              pa = 0;
              pr = pg = pb = 0;
            }
          } else {
            // Brand gradient: #059669 → #0284C7 along the diagonal.
            const t = clamp01((px / size + py / size) / 2);
            pr = lerp(5, 2, t);
            pg = lerp(150, 132, t);
            pb = lerp(105, 199, t);

            if (leaf && !stem) {
              pr = pg = pb = 255;
            } else if (stem) {
              pr = 5;
              pg = 150;
              pb = 105;
            } else if (pulse) {
              pr = 236;
              pg = 253;
              pb = 245;
            }
          }

          r += pr * pa;
          g += pg * pa;
          b += pb * pa;
          a += pa;
        }
      }

      const samples = SS * SS;
      const i = (y * size + x) * 4;
      if (a === 0) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
      } else {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
        rgba[i + 3] = Math.round((a / samples) * 255);
      }
    }
  }

  return encodePng(size, size, rgba);
}

/* --------------------------------- Output --------------------------------- */

const files = [
  ["icon-192.png", render(192)],
  ["icon-512.png", render(512)],
  ["maskable-192.png", render(192, { maskable: true })],
  ["maskable-512.png", render(512, { maskable: true })],
  ["monochrome-512.png", render(512, { monochrome: true })],
  ["apple-touch-icon.png", render(180)],
  ["shortcut-diet.png", render(96)],
  ["shortcut-workout.png", render(96)],
  ["shortcut-chat.png", render(96)],
];

for (const [name, buffer] of files) {
  writeFileSync(join(OUT, name), buffer);
  console.log(`✓ icons/${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
}
