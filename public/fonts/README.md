# IRANYekan font files

HelloFit / هلوفیت uses **IRANYekan (ایران‌یکان)** exclusively — headings, body copy,
numerals and microcopy alike. The font is commercially licensed, so the binaries are
**not** committed to this repository.

## Install

Drop the licensed `woff2` files here with exactly these names (they are what
`src/app/globals.css` and `public/offline.html` reference):

```
public/fonts/
├── IRANYekanX-Light.woff2       # 300
├── IRANYekanX-Regular.woff2     # 400
├── IRANYekanX-Medium.woff2      # 500
├── IRANYekanX-Bold.woff2        # 700
└── IRANYekanX-ExtraBold.woff2   # 800
```

No other change is needed — the `@font-face` block and the Tailwind
`fontFamily.sans` / `fontFamily.yekan` stacks already point at them.

## While the files are missing

The stack falls back to `IRANYekanX → Vazirmatn → Tahoma → system-ui`, so the app
stays fully legible in Persian during development. To use Vazirmatn (free, OFL) as a
stand-in, install it and drop `Vazirmatn-*.woff2` here with matching `@font-face`
rules, or load it from a CDN in `src/app/layout.tsx`.

## Notes

* `font-display: swap` is set on every face so a cold TWA launch never blocks on text.
* Persian numerals are produced by `src/lib/format.ts` (`toFa`, `faNumber`, …) rather
  than by font features, so digits render correctly even on the fallback stack.
* Subsetting to `arabic + latin + digits` typically cuts each face to ~35 KB; worth
  doing before shipping the TWA.
