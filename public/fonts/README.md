# IRANYekan font files

HelloFit / هلوفیت uses **IRANYekan** exclusively — headings, body copy, numerals
and microcopy alike, across the client app, the clinician workspace and the
operations console.

## What is installed

Two cuts of the same design live here.

| File | Weight | Role |
|---|---|---|
| `IRANYekanX-Regular.woff2` | 400 | body copy — declared over **300–400** |
| `IRANYekanX-Medium.woff2` | 500 | `font-medium` |
| `IRANYekanX-Bold.woff2` | 700 | `font-bold` — declared over **600–700** |
| `IRANYekanWebExtraBold.woff2` | 800 | `font-extrabold` — headings and section titles |
| `IRANYekanWebBlack.woff2` | 900 | declared over **900–950**, currently unused |
| `IRANYekanWebLight.woff2` | 300 | superseded by X Regular; kept for reference |
| `IRANYekanWebBold.woff2` | 700 | superseded by X Bold; kept for reference |
| `IRANYekanWebExtraBlack.woff2` | 950 | covered by the 900–950 range |

**X owns the text range.** It is the newer cut and covers 400/500/700, which is
where essentially the whole UI sits. **Web's ExtraBold carries 800** — the app's
heading weight — and reads a clear step above X Bold while staying on the same
skeleton.

Four faces are ever matched by a rule (~108 KB); the rest are never fetched.
Regular, Bold and ExtraBold are preloaded from `src/app/layout.tsx`; Medium
loads normally, since it appears on far fewer nodes.

All faces carry the full Persian alphabet, Persian digits (U+06F0–U+06F9), the
thousands (`٬`) and decimal (`٫`) marks and Latin — verified glyph by glyph.

## Notes

- `font-display: swap` on every face, so a cold TWA launch never blocks on text.
- Persian numerals come from `src/lib/format.ts` (`toFa`, `faNumber`, …), not
  from font features, so digits stay correct even on the fallback stack.
- Fallback stack: `IRANYekan → Vazirmatn → Tahoma → system-ui`.
- The two families have different units-per-em (X 1000, Web 2200). That is
  normalised by the renderer and does not affect layout; what matters is that
  they share a design lineage, which is why they mix without a visible seam.
