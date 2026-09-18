/**
 * Rasterises every PNG the manifest references from the real brand mark.
 *
 *   node scripts/generate-icons.mjs
 *
 * Chromium is the renderer (it is already present for the e2e drives), so the
 * icons are pixel-identical to how the SVG paints in the browser — no second
 * rasteriser to disagree with. Source of truth: public/brand/hellofit-mark.svg.
 */

import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

const markSvg = readFileSync(join(ROOT, "public", "brand", "hellofit-mark.svg"), "utf8");

const BRAND = "#FF5252";
const SURFACE = "#FFFFFF";

/**
 * `any` icons sit on a rounded white tile (Android/iOS draw them as-is).
 * `maskable` fill the whole canvas on brand coral with the art inside the 80%
 * safe zone, so no launcher mask can clip the monogram.
 */
function page({ size, mode }) {
  const radius = mode === "maskable" ? 0 : Math.round(size * 0.22);
  const background = mode === "maskable" ? BRAND : SURFACE;
  const inset = mode === "maskable" ? 0.3 : 0.18;
  const art = mode === "maskable" ? markSvg.replaceAll(BRAND, SURFACE) : markSvg;

  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent}
    .tile{width:${size}px;height:${size}px;border-radius:${radius}px;background:${background};
          display:flex;align-items:center;justify-content:center;overflow:hidden}
    .art{width:${Math.round(size * (1 - inset * 2))}px;height:${Math.round(size * (1 - inset * 2))}px;
         display:flex;align-items:center;justify-content:center}
    .art svg{width:100%;height:100%}
  </style></head><body><div class="tile"><div class="art">${art}</div></div></body></html>`;
}

const TARGETS = [
  { file: "icon-192.png", size: 192, mode: "any" },
  { file: "icon-512.png", size: 512, mode: "any" },
  { file: "maskable-192.png", size: 192, mode: "maskable" },
  { file: "maskable-512.png", size: 512, mode: "maskable" },
  { file: "monochrome-512.png", size: 512, mode: "maskable" },
  { file: "apple-touch-icon.png", size: 180, mode: "any" },
  { file: "shortcut-diet.png", size: 96, mode: "any" },
  { file: "shortcut-workout.png", size: 96, mode: "any" },
  { file: "shortcut-chat.png", size: 96, mode: "any" },
  { file: "favicon-32.png", size: 32, mode: "any" },
];

const executablePath = execSync(
  "ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1",
)
  .toString()
  .trim();

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ["--no-sandbox"],
});

for (const target of TARGETS) {
  const p = await browser.newPage({
    viewport: { width: target.size, height: target.size },
    deviceScaleFactor: 1,
  });
  await p.setContent(page(target));
  await p.waitForTimeout(80);
  await p.locator(".tile").screenshot({ path: join(OUT, target.file), omitBackground: target.mode === "any" });
  await p.close();
  console.log(`✓ icons/${target.file} (${target.size}×${target.size}, ${target.mode})`);
}

await browser.close();
