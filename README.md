<div align="center">

# هلوفیت · HelloFit

**پلتفرم جامع رژیم غذایی، تمرین و مشاوره تخصصی**

Mobile-first PWA / Android TWA · Next.js · Tailwind · Framer Motion · full RTL · IRANYekan

</div>

---

## What this is

A diet, fitness and nutritionist-consultation platform: a mobile PWA/TWA for
clients, a clinician workspace, an operations console, and the realtime gateway
behind them.
All RTL, all IRANYekan, light mode only.

| Surface | Route | Who |
|---|---|---|
| Client app | `/` … `/profile` | مراجع — five fixed tabs on a phone |
| Clinician workspace | `/doctor`, `/doctor/desk` | متخصص — roster, plan builders, consultation desk |
| Operations console | `/admin` | مدیر — analytics, users, specialists, content |
| Gateway | `server/` | Socket.io + media + RBAC API |

**There is no auth.** By design the app boots straight into the authenticated dashboard
with fully populated mock state. See [`docs/ARCHITECTURE.md §2`](docs/ARCHITECTURE.md)
for the two places sign-in will slot into later. The onboarding wizard is a *health*
gate, not an auth gate — the seeded user has already completed it.

## Quick start

```bash
# web — three portals, one Next app
npm install
npm run dev              # http://localhost:3000

# gateway — realtime chat, media, RBAC API
cd server
cp .env.example .env
npm install
npm run dev              # http://localhost:4000
npm test                 # 14 integration tests, no containers needed
```

With object storage:

```bash
cd server && JWT_SECRET=$(openssl rand -hex 32) docker compose up -d
# gateway :4000 · MinIO console :9001
```

```bash
npm run build      # production build
npm run start      # serve it
npm run typecheck  # tsc --noEmit
npm run icons      # regenerate public/icons/*.png from the brand mark
```

> **Fonts.** IRANYekanX (Regular 400 · Medium 500 · Bold 700) carries the text
> range; IRANYekanWeb ExtraBold 800 carries headings. Both are committed under
> `public/fonts/`. See [`public/fonts/README.md`](public/fonts/README.md).

> **Brand.** The mark is traced from the supplied Figma PDFs into
> `public/brand/` by `scripts/pdf-logo-to-svg.mjs`, and every PWA icon is
> rasterised from it (`npm run icons`). The mark's coral is `#FF5252`; the UI
> accent remains emerald `#059669` per the product spec.

## The five tabs

| # | Tab | Route | What's in it |
|---|---|---|---|
| ① | **امروز** | `/` | Calories in vs. burned, quick water and weight loggers, interactive three-ring compliance gauge, next-up cards |
| ② | **برنامه‌های من** | `/plans` | **Diet** — meals by slot, per-meal macro counter, item checkboxes, intelligent Food Swap<br>**Workout** — weekly strip, target muscles, sets×reps tracker, animated movement preview<br>**Supplements** — time-based windows, dosage specs, auto-timestamped checkboxes, per-item reminder toggles |
| ③ | **مشاورین** | `/specialists` | Directory with specialty / price / rating filters and sorting, coach profiles, credentials, reviews, package selection, booking desk |
| ④ | **مقالات علمی** | `/articles` | Four domains, search, bookmarks, reader with progress bar, reading time, author credential chip, evidence level and citations |
| ⑤ | **پروفایل و ترکر** | `/profile` | Weight trend chart, BMI gauge, body measurements, avatar crop/upload modal, subscription, order history, preferences |

Plus `/chat/[threadId]` — the consultation screen, pushed over the tabs —
`/onboarding` and `/doctor`.

## Operations console — `/admin`

| Screen | What's in it |
|---|---|
| **Overview** | KPI tiles, 12-week trend as **small multiples** (three measures, three scales — never a dual axis), retention cohort heatmap on a single-hue sequential ramp, specialist revenue bars |
| **Users** | Search and status filters; per-user deep dive with assessment answers, BMI, plan, adherence and the full payment log |
| **Specialists** | Credential review (approve/reject), licence, capacity load, fee and an editable commission rate |
| **Content** | Articles and recipes with publish actions, plus a push-broadcast composer with audience segments and a device preview |

The palette is validated, not eyeballed — emerald/sky/amber pass the lightness,
chroma, CVD-separation and contrast checks against a white surface.

## Doctor View

A mock role switch (header chip, and Profile → نمای برنامه) flips the app into the
specialist portal, where the bottom nav becomes **بیماران · گفتگوها · مقالات · پروفایل**.

| Screen | What's in it |
|---|---|
| **Patient roster** `/doctor` | Practice summary, search and filters (needs review / low adherence / unread), per-patient badges for BMI band, 7-day adherence and weight change |
| **Patient workspace** `/doctor/[id]` | Context card (targets, conditions, allergies, supervision warning) plus three builders |
| **Diet builder** | Calorie ceiling, macro split sliders that always total 100, meals by slot, a searchable food library, per-meal notes |
| **Workout builder** | Day picker, exercise library, sets × reps × rest steppers, per-exercise notes, inline animated movement previews |
| **Supplement scheduler** | Dosage, time and window per item, reminder toggles, and **ارسال به تایم‌لاین** which writes straight into the client's own supplement timeline and fires a notification |
| **Chat bridge** | `/chat/:thread?patient=:id` — patient context bar, and the transcript's outgoing side flips to the clinician |
| **Consultation desk** `/doctor/desk` | Three panes: roster · live thread · clinical context (history, prior lab PDFs, quick-prescribe). Collapses to one column with a roster drawer on a phone |

## Highlighted subsystems

- **Notifications** — meal, supplement, workout and chat reminders derived from the plan
  on a 30 s tick, delivered through the service worker with action buttons, deduped per
  day, and always mirrored into an in-app inbox so a denied permission is never a dead
  end. → [`docs/notifications.md`](docs/notifications.md)
- **Onboarding assessment** — five steps (biometrics → activity → goal → conditions and
  allergies → summary) that compute BMI, BMR (Mifflin-St Jeor), TDEE, a goal-adjusted
  calorie target with a safety floor, macros and a water target, then rewrite the
  targets the whole client side reads.

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
- [`docs/backend.md`](docs/backend.md) — gateway: RBAC, socket protocol, media pipeline, REST surface
- [`docs/notifications.md`](docs/notifications.md) — reminder pipeline, permission UX, path to real web push
- [`twa/README.md`](twa/README.md) — Bubblewrap build, asset links, release checklist
- [`docs/twa-packaging.md`](docs/twa-packaging.md) — Bubblewrap, asset links, store checklist

## Status

The gateway in `server/` is real, tested code — RBAC, room isolation, keyset
pagination, the streaming 30 MB guard and the avatar pipeline all have
integration coverage. Its persistence layer is in-memory behind a `Repository`
interface; swapping in Postgres touches one file.

The web app still reads from `lib/mock/` so all three portals run without the
gateway. [`docs/ARCHITECTURE.md §7`](docs/ARCHITECTURE.md) maps each mock to the
endpoint that replaces it, and [`docs/backend.md`](docs/backend.md) lists what is
left before production.
