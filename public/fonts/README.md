# IRANYekan font files

HelloFit / هلوفیت uses **IRANYekan (ایران‌یکان)** exclusively — headings, body copy,
numerals and microcopy alike.

## What is installed

The `IRANYekanWeb` (web-optimised) faces supplied for this project are committed here:

| File | Weight | Size | Used for |
|---|---|---|---|
| `IRANYekanWebLight.woff2` | 300 | 25 KB | body copy, `font-medium` — declared over the **300–500** range |
| `IRANYekanWebBold.woff2` | 700 | 25 KB | `font-bold` — declared over **600–700** |
| `IRANYekanWebExtraBold.woff2` | 800 | 24 KB | `font-extrabold` (headings, section titles) |
| `IRANYekanWebBlack.woff2` | 900 | 23 KB | declared, currently unused |
| `IRANYekanWebExtraBlack.woff2` | 950 | 25 KB | declared, currently unused |

All five carry the full Persian alphabet, Persian digits (U+06F0–U+06F9), the Persian
thousands (`٬`) and decimal (`٫`) marks, and Latin — verified glyph-by-glyph.

Only Light, Bold and ExtraBold are ever matched by a CSS rule, so a page downloads
~76 KB of font. Those three are preloaded in `src/app/layout.tsx`; Black and ExtraBlack
are declared but never fetched.

## Missing: Regular (400) and Medium (500)

The supplied set jumps from Light (300) to Bold (700). Because IRANYekanWeb Light is a
comfortable text weight, `globals.css` declares it across **300–500** so body copy and
`font-medium` resolve to a real face rather than dropping out of the family or being
synthesised by the browser.

To use the exact faces instead, drop these two files in beside the others:

```
public/fonts/IRANYekanWebRegular.woff2    # 400
public/fonts/IRANYekanWebMedium.woff2     # 500
```

then narrow the Light rule in `src/app/globals.css` back to `font-weight: 300;` and add:

```css
@font-face {
  font-family: "IRANYekan";
  src: url("/fonts/IRANYekanWebRegular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "IRANYekan";
  src: url("/fonts/IRANYekanWebMedium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
```

Nothing else changes — no component references a face directly.

## Notes

- `font-display: swap` on every face, so a cold TWA launch never blocks on text.
- Persian numerals come from `src/lib/format.ts` (`toFa`, `faNumber`, …), not from font
  features, so digits stay correct even on the fallback stack.
- The fallback stack is `IRANYekan → Vazirmatn → Tahoma → system-ui`.
- These faces are already web-subset; further subsetting to `arabic + latin + digits`
  would shave a few KB more if it matters for the TWA bundle.
