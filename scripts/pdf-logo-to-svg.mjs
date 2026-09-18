/**
 * Converts the Figma-exported HelloFit logo PDFs into SVG.
 *
 *   node scripts/pdf-logo-to-svg.mjs <input.pdf> <output.svg>
 *
 * PDF path operators map almost one-to-one onto SVG, so this walks the content
 * stream, tracks the graphics state (q/Q, cm, scn) and re-emits each filled
 * subpath as a <path>. The only real work is the coordinate system: PDF is
 * y-up with the origin bottom-left, SVG is y-down from the top-left.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("usage: node scripts/pdf-logo-to-svg.mjs <input.pdf> <output.svg>");
  process.exit(1);
}

const pdf = readFileSync(inputPath);

/* ----------------------------- locate content ---------------------------- */

const mediaBox = /\/MediaBox\s*\[([^\]]+)\]/.exec(pdf.toString("latin1"));
const [, , boxW, boxH] = mediaBox
  ? mediaBox[1].trim().split(/\s+/).map(Number)
  : [0, 0, 57, 20];

function contentStream() {
  const hay = pdf.toString("latin1");
  let index = 0;
  let best = null;
  while ((index = hay.indexOf("stream", index)) !== -1) {
    let start = index + "stream".length;
    if (hay[start] === "\r") start += 1;
    if (hay[start] === "\n") start += 1;
    let end = hay.indexOf("endstream", start);
    if (end === -1) break;
    // Trim the EOL that precedes "endstream" — Node's inflate rejects trailing bytes.
    let stop = end;
    while (stop > start && (hay[stop - 1] === "\n" || hay[stop - 1] === "\r")) stop -= 1;
    try {
      const out = inflateSync(pdf.subarray(start, stop));
      // The drawing stream is the one that sets colours.
      if (out.includes("scn")) best = out.toString("latin1");
    } catch {
      /* not a Flate stream (ICC profiles, fonts) — skip */
    }
    index = end + "endstream".length;
  }
  return best;
}

const body = contentStream();
if (!body) {
  console.error("no content stream with drawing operators found");
  process.exit(1);
}

/* ------------------------------- interpret ------------------------------- */

const identity = [1, 0, 0, 1, 0, 0];
const multiply = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/** Applies the CTM, then flips y so the result is in SVG space. */
const apply = (ctm, x, y) => {
  const px = ctm[0] * x + ctm[2] * y + ctm[4];
  const py = ctm[1] * x + ctm[3] * y + ctm[5];
  return [round(px), round(boxH - py)];
};

const round = (n) => Math.round(n * 1000) / 1000;
const hex = (r, g, b) =>
  "#" + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

const tokens = body.split(/\s+/).filter(Boolean);
const stack = [];
let ctm = identity;
let fill = "#000000";
let operands = [];
let d = "";
const paths = [];

const num = (i) => Number(operands[operands.length + i]);

for (const token of tokens) {
  if (/^-?[\d.]+$/.test(token)) {
    operands.push(token);
    continue;
  }

  switch (token) {
    case "q":
      stack.push({ ctm, fill });
      break;
    case "Q": {
      const prev = stack.pop();
      if (prev) ({ ctm, fill } = prev);
      break;
    }
    case "cm":
      ctm = multiply([num(-6), num(-5), num(-4), num(-3), num(-2), num(-1)], ctm);
      break;
    case "scn":
    case "sc":
    case "rg":
      if (operands.length >= 3) fill = hex(num(-3), num(-2), num(-1));
      break;

    case "m": {
      const [x, y] = apply(ctm, num(-2), num(-1));
      d += `M${x} ${y}`;
      break;
    }
    case "l": {
      const [x, y] = apply(ctm, num(-2), num(-1));
      d += `L${x} ${y}`;
      break;
    }
    case "c": {
      const [x1, y1] = apply(ctm, num(-6), num(-5));
      const [x2, y2] = apply(ctm, num(-4), num(-3));
      const [x3, y3] = apply(ctm, num(-2), num(-1));
      d += `C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
      break;
    }
    case "v": {
      const [x2, y2] = apply(ctm, num(-4), num(-3));
      const [x3, y3] = apply(ctm, num(-2), num(-1));
      d += `S${x2} ${y2} ${x3} ${y3}`;
      break;
    }
    case "re": {
      const [x, y, w, h] = [num(-4), num(-3), num(-2), num(-1)];
      const c = [
        apply(ctm, x, y),
        apply(ctm, x + w, y),
        apply(ctm, x + w, y + h),
        apply(ctm, x, y + h),
      ];
      d += `M${c[0][0]} ${c[0][1]}L${c[1][0]} ${c[1][1]}L${c[2][0]} ${c[2][1]}L${c[3][0]} ${c[3][1]}Z`;
      break;
    }
    case "h":
      d += "Z";
      break;

    case "f":
    case "F":
    case "f*":
    case "b":
    case "b*":
    case "B":
    case "B*":
      if (d) paths.push({ d, fill, evenOdd: token.endsWith("*") });
      d = "";
      break;
    case "n":
    case "W":
    case "W*":
      if (token === "n") d = "";
      break;
    default:
      break;
  }

  if (!/^-?[\d.]+$/.test(token)) operands = [];
}

/* -------------------------------- emit ---------------------------------- */

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxW} ${boxH}" fill="none" role="img" aria-label="HelloFit">`,
  ...paths.map(
    (p) =>
      `  <path d="${p.d}" fill="${p.fill}"${p.evenOdd ? ' fill-rule="evenodd" clip-rule="evenodd"' : ""}/>`,
  ),
  "</svg>",
  "",
].join("\n");

writeFileSync(outputPath, svg);
console.log(
  `✓ ${outputPath} — ${paths.length} paths, ${[...new Set(paths.map((p) => p.fill))].join(" ")}, ${(svg.length / 1024).toFixed(1)} KB`,
);
