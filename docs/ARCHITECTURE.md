# HelloFit / هلوفیت — architecture

Mobile-first PWA, built to be wrapped as an Android **Trusted Web Activity**.
Next.js App Router · React 19 · TypeScript · Tailwind CSS · Framer Motion.

---

## 1. Shape of the app

```
src/
├── app/                         routes (App Router)
│   ├── layout.tsx               lang="fa" dir="rtl", viewport-fit=cover, providers
│   ├── page.tsx                 ① امروز        — dashboard
│   ├── plans/                   ② برنامه‌های من — diet | workout | supplements
│   ├── specialists/[id]/        ③ مشاورین      — directory, profile, booking
│   ├── articles/[slug]/         ④ مقالات علمی  — feed + reader
│   ├── profile/                 ⑤ پروفایل و ترکر
│   ├── onboarding/              health & biometrics assessment wizard
│   ├── admin/                   operations console (desktop chrome, own sidebar)
│   ├── doctor/[patientId]/      specialist portal: roster + plan builders
│   ├── doctor/desk/             consultation desk (roster · thread · context)
│   └── chat/[threadId]/         consultation chat (pushed, no bottom nav)
├── components/
│   ├── layout/                  AppShell · AppHeader · BottomNav · PullToRefresh · Logo · RoleSwitcher
│   ├── ui/                      Sheet · Toast · ProgressRing · Bits (Card/Chip/Toggle/Sep/…) · Icons
│   ├── onboarding/              OnboardingWizard · OnboardingGate · form primitives
│   ├── notifications/           PermissionCard · Inbox (+ channel settings)
│   ├── admin/                   AdminShell · validated chart primitives
│   ├── doctor/                  PatientCard · builders · ConsultationDesk
│   ├── today/ plans/ chat/ articles/ specialists/ profile/
├── lib/
│   ├── format.ts                Persian digits, Jalali dates, file sizes, cx()
│   ├── health/calc.ts           BMI · BMR (Mifflin-St Jeor) · TDEE · macro targets
│   ├── notifications/           permission · scheduler · driver hook · provider
│   ├── mock/                    fully populated demo state (incl. patients, libraries)
│   ├── store/AppStore.tsx       reducer + context, persisted to localStorage
│   ├── ws/                      mockSocket.ts · useChatSocket.ts
│   ├── upload/                  fileGuards.ts (30 MB) · useFileUpload.ts
│   └── image/cropCanvas.ts      avatar crop/encode
└── types/index.ts               one domain model for the whole app
```

`public/` carries the PWA surface: `manifest.json`, `sw.js`, `offline.html`,
`brand/` (traced from the Figma PDFs), `icons/` (rasterised from the brand mark by
`scripts/generate-icons.mjs`), `.well-known/assetlinks.json`.

`server/` is the realtime gateway — Socket.io, the media pipeline and the RBAC API.
It is a standalone package with its own `package.json`, Dockerfile and tests. See
[`backend.md`](backend.md).

`twa/` holds the Bubblewrap descriptor and build script. See [`twa/README.md`](../twa/README.md).

---

## 2. Authentication — deliberately absent

There is **no** login, sign-up, OTP or splash gate. `app/layout.tsx` mounts
`AppStoreProvider` seeded from `lib/mock/user.ts`, and `/` renders the authenticated
dashboard immediately.

When auth lands, it slots in at exactly two points and nothing else moves:

1. A `middleware.ts` redirect for unauthenticated requests.
2. `AppStoreProvider` hydrating from `/api/me` instead of the mock module.

Every screen already reads the user through `useAppStore()`, so no component needs to change.

### Onboarding is a health gate, not an auth gate

`OnboardingGate` routes to `/onboarding` when `assessment.completedAt` is `null`. The
seeded mock user has already completed it, so the demo still lands straight on the
dashboard — the no-auth-gate rule is intact. Clearing it is an explicit action:
**Profile → ارزیابی سلامت → شبیه‌سازی کاربر جدید**. The gate waits for `hydrated`
before redirecting, so a returning user is never bounced.

## 2b. Roles

`state.role` is `"client" | "specialist"`, flipped by `RoleSwitcher` (header chip and
Profile). It stands in for the role claim a real session would carry. Switching also
navigates to that role's home, because `BottomNav` swaps its tab set:

| Role | Surface |
|---|---|
| client | امروز · برنامه‌های من · مشاورین · مقالات · پروفایل (phone tabs) |
| specialist | بیماران · میز مشاوره · مقالات · پروفایل (phone tabs) |
| admin | the operations console at `/admin`, with its own sidebar; the phone nav is suppressed |

The same three roles exist on the gateway as a permission table, so a route
checks a capability rather than a role name — see [`backend.md §2`](backend.md).

The consultation screen reads the role too: opened as `/chat/:id?patient=:pid` from the
portal it shows a `PatientContextBar` and flips the transcript's outgoing side, so the
clinician's own messages sit where they expect them.

---

## 3. Shell & navigation

`AppShell` pins a `100dvh` flex column — header, one scrolling pane, bottom nav — so the
document itself never scrolls. That is what makes the TWA feel native: no address-bar
collapse, no rubber-band at the document level, and a nav bar that cannot drift.

- **Safe areas** — `env(safe-area-inset-*)` via the `pt-safe` / `pb-safe` utilities and
  `viewportFit: "cover"`. Gesture-nav handles and notches never overlap content.
- **Pull-to-refresh** — `PullToRefresh` implements the gesture in JS because
  `overscroll-behavior: none` disables the browser's own. It engages only at `scrollTop === 0`,
  applies rubber-band resistance and awaits the caller's promise.
- **Bottom nav** — five fixed tabs; the active pill is a shared `layoutId` so it slides.
- **Transitions** — sub-tabs slide with RTL-correct direction; sheets spring from the bottom
  and are drag-to-dismiss. All of it collapses under `prefers-reduced-motion`.

---

## 4. RTL and typography

`<html lang="fa" dir="rtl">` with Tailwind's logical properties throughout. The lessons
that shaped the components:

- **Numerals** are converted with `toFa()` / `faNumber()`, never left to the font, so they
  are correct on the fallback stack too. `٬` groups thousands, `٫` marks decimals.
- **Separators** use `<Sep />` (a rendered dot element), not a `·` character: next to
  Persian digits a middot is indistinguishable from `۰`.
- **Signed values** (`+۲۵۰`, `−۲۸ کالری`, `۱٫۰×`) are wrapped in `dir="ltr"` so the sign
  stays attached to its number.
- **Chat bubbles** mirror: outgoing left, incoming right, matching every RTL messenger.
- **Charts** opt out of RTL (`direction: ltr` on the `<svg>`) so anchors and the time axis
  stay predictable, while the Persian labels inside still shape correctly.
- **SVG transforms** set `transform-box: view-box` before `transform-origin`, or limbs and
  needles rotate about the wrong pivot.
- **Signed values in prose** are written as words (کاهش/افزایش, کمتر/بیشتر) or arrows
  (▼ ▲) rather than a bare `−`, which bidi floats away from its number.
- **Years** are rendered with `toFa()`, not `faNumber()` — a Jalali year must not be
  grouped as ۱٬۳۷۳.
- **Sheets render through a portal on `<body>`.** `position: fixed` resolves against the
  nearest ancestor with a transform, filter, `backdrop-filter` or containment — and the
  app header has `backdrop-blur`. Without the portal, a sheet opened from the header is
  clipped to the header's box.

Typography is IRANYekan only. The `IRANYekanWeb` faces live in `public/fonts/`: Light 300,
Bold 700, ExtraBold 800, Black 900, ExtraBlack 950. The set has no Regular (400) or
Medium (500), so `globals.css` declares Light across the **300–500** range — body copy and
`font-medium` land on a real face instead of dropping out of the family or being
synthesised. Only Light, Bold and ExtraBold are ever matched (~76 KB total) and those
three are preloaded from `layout.tsx`. See `public/fonts/README.md` for the two-file
drop-in that restores the exact weights.

---

## 5. State

One reducer in `lib/store/AppStore.tsx`, persisted to `localStorage` under
`hellofit.state.v2`, covering water, weight, meal/exercise/supplement completion, food
swaps, bookmarks, the avatar, the role, the onboarding assessment, notification
channels + inbox, and the specialist's plan drafts. Hydration merges nested slices
field-by-field, so a blob written by an older build cannot drop a key newer code reads.

It derives `targets` (from the assessment, via `lib/health/calc.ts`), the unread
notification count, `needsOnboarding`, and the dashboard's compliance ring:

```
overall = meals×0.40 + workout×0.25 + supplements×0.15 + water×0.20
```

Realtime chat state is intentionally **not** in this store — it lives in `useChatSocket`,
scoped to the screen, because it is transport state rather than user state.

---

## 6. PWA / TWA

| Concern | Where |
|---|---|
| Manifest | `public/manifest.json` — `standalone`, `dir: rtl`, maskable + monochrome icons, shortcuts, `share_target` |
| Service worker | `public/sw.js` — SWR for assets, network-first navigations with `offline.html`, **network-only for `/api/*`** |
| Registration | `components/layout/ServiceWorkerBridge.tsx`, production only, after `load` |
| Icons | `scripts/generate-icons.mjs` — dependency-free PNG encoder, `npm run icons` |
| Digital Asset Links | `public/.well-known/assetlinks.json` — fingerprint placeholder |
| Push | `sw.js` handles `push`, `message`, `notificationclick`, `notificationclose` — see [`notifications.md`](notifications.md) |

Health data is never cached: `/api/*` is excluded from the service worker outright.

See `docs/twa-packaging.md` for the Play Store path.

---

## 7. Where the mocks are

Everything under `lib/mock/` is demo data. The rest of the code reads it through the store
or through a hook, so replacing it is mechanical:

| Mock | Replace with |
|---|---|
| `mock/user.ts` | `GET /api/me`, `GET /api/logs/today`, `GET /api/measurements` |
| `mock/diet.ts`, `mock/workouts.ts`, `mock/supplements.ts` | `GET /api/plans/active` |
| `mock/specialists.ts` | `GET /api/specialists?…` |
| `mock/articles.ts` | `GET /api/articles?…` |
| `mock/chat.ts` + `ws/mockSocket.ts` | `wss://…/v1/threads/:id` + `GET /api/threads/:id/messages` |
| `useFileUpload`'s `mockTransport` | chunked `PUT /api/uploads/:id/chunk/:n` |
| `mock/patients.ts` | `GET /api/specialist/patients` |
| `mock/library.ts` | `GET /api/library/{foods,exercises,supplements}` |
| `doctor/*` drafts in the store | `PUT /api/specialist/patients/:id/plans/{diet,workout,supplements}` |
| client-side reminder loop | web push from the server (see `notifications.md §5`) |
