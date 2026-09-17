<div align="center">

# هلوفیت · HelloFit

**پلتفرم جامع رژیم غذایی، تمرین و مشاوره تخصصی**

Mobile-first PWA / Android TWA · Next.js · Tailwind · Framer Motion · full RTL · IRANYekan

</div>

---

## What this is

A production-shaped front end for a diet, fitness and nutritionist-consultation product:
five fixed tabs, a real-time consultation chat with a 30 MB attachment pipeline, an
evidence-based article library, and a body tracker — all RTL, all IRANYekan, light mode only.

**There is no auth.** By design the app boots straight into the authenticated dashboard
with fully populated mock state. See [`docs/ARCHITECTURE.md §2`](docs/ARCHITECTURE.md)
for the two places sign-in will slot into later.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run start      # serve it
npm run typecheck  # tsc --noEmit
npm run icons      # regenerate public/icons/*.png from the brand mark
```

> **Fonts.** IRANYekanWeb is installed — Light 300, Bold 700, ExtraBold 800, Black 900,
> ExtraBlack 950, committed under `public/fonts/`. The set has no Regular (400) or
> Medium (500), so the Light face is declared across 300–500; see
> [`public/fonts/README.md`](public/fonts/README.md) for the two-file drop-in that
> restores the exact weights.

## The five tabs

| # | Tab | Route | What's in it |
|---|---|---|---|
| ① | **امروز** | `/` | Calories in vs. burned, quick water and weight loggers, interactive three-ring compliance gauge, next-up cards |
| ② | **برنامه‌های من** | `/plans` | **Diet** — meals by slot, per-meal macro counter, item checkboxes, intelligent Food Swap<br>**Workout** — weekly strip, target muscles, sets×reps tracker, animated movement preview<br>**Supplements** — time-based windows, dosage specs, auto-timestamped checkboxes, per-item reminder toggles |
| ③ | **مشاورین** | `/specialists` | Directory with specialty / price / rating filters and sorting, coach profiles, credentials, reviews, package selection, booking desk |
| ④ | **مقالات علمی** | `/articles` | Four domains, search, bookmarks, reader with progress bar, reading time, author credential chip, evidence level and citations |
| ⑤ | **پروفایل و ترکر** | `/profile` | Weight trend chart, BMI gauge, body measurements, avatar crop/upload modal, subscription, order history, preferences |

Plus `/chat/[threadId]` — the consultation screen, pushed over the tabs.

## Highlighted subsystems

- **Real-time chat** — `lib/ws/` mirrors the production socket protocol exactly
  (`message.send` / `message.ack` / `typing` / `read` / `presence` / `history.page`), with
  optimistic bubbles, staged read receipts, typing indicators and a REST-paginated
  history fallback. → [`docs/chat-screen.md`](docs/chat-screen.md)
- **30 MB attachment pipeline** — validated at the `accept` attribute, again in
  `guardFile()` before a single byte moves, and contractually at the API. Chunked at
  512 KB with live progress, speed, cancel and retry. → [`docs/chat-screen.md §3`](docs/chat-screen.md)
- **Avatar crop/upload** — pick → on-device preview → pan/zoom crop → 512² JPEG →
  upload with progress → save/remove. A 6 MB camera shot leaves the device at ~80 KB,
  EXIF stripped. → [`docs/avatar-upload-crop.md`](docs/avatar-upload-crop.md)
- **PWA/TWA shell** — `standalone`, safe-area padding everywhere, JS pull-to-refresh,
  offline fallback, maskable + monochrome icons, manifest shortcuts and a share target.
  → [`docs/twa-packaging.md`](docs/twa-packaging.md)

## Design tokens

| Token | Value |
|---|---|
| Canvas | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Border | `#E2E8F0` |
| Primary (health) | `#059669` |
| Secondary (sky) | `#0284C7` |
| Ink / muted / soft | `#0F172A` / `#64748B` / `#94A3B8` |
| Type | IRANYekanWeb — Light 300 (body, via a 300–500 range) · Bold 700 · ExtraBold 800 |

Light mode only — there is no dark theme and no theme switch.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — structure, shell, RTL rules, state, PWA, mock→API map
- [`docs/chat-screen.md`](docs/chat-screen.md) — chat component breakdown + attachment pipeline
- [`docs/avatar-upload-crop.md`](docs/avatar-upload-crop.md) — avatar modal breakdown + crop math
- [`docs/twa-packaging.md`](docs/twa-packaging.md) — Bubblewrap, asset links, store checklist

## Status

Front end only. Every network boundary is mocked behind a hook or a module under
`lib/mock/`, and [`docs/ARCHITECTURE.md §7`](docs/ARCHITECTURE.md) maps each one to the
endpoint that replaces it.
