# Consultation Chat — component breakdown

> Route `app/chat/[threadId]` · composition root `components/chat/ChatScreen.tsx`

The consultation screen is the most stateful surface in HelloFit: a live socket, an
optimistic transcript, a paginated history fallback and a chunked upload pipeline with
a hard 30 MB ceiling. Everything below is in the repository and runs against the mock
transport; swapping in the production backend touches two files.

---

## 1. Component tree

```
app/chat/[threadId]/page.tsx          route — reads threadId, renders the screen
└── ChatScreen                        composition root; owns nothing but wiring
    ├── ChatHeader                    coach identity · presence dot · "typing…" line
    ├── ConnectionBanner (inline)     amber strip while the socket is down
    ├── MessageList                   scroll pane, stick-to-bottom, top sentinel
    │   ├── DaySeparator (inline)     امروز / دیروز / ۲۶ شهریور chips
    │   ├── MessageBubble             one row: reply quote, body, meta
    │   │   ├── AttachmentView        dispatches on attachment.kind
    │   │   │   ├── ImageAttachment   lazy <img>, size badge, skeleton
    │   │   │   ├── DocumentAttachment PDF / lab result card
    │   │   │   └── VoiceNote         play/pause, scrubbing waveform, duration
    │   │   └── StatusTicks           ⏱ queued · ✓ sent · ✓✓ delivered · ✓✓ read
    │   └── TypingIndicator           three-dot bubble
    ├── UploadTray                    live queue: thumb, %, speed, cancel, retry
    └── Composer
        ├── QuickReplies              one-tap canned answers (short threads only)
        ├── auto-growing <textarea>   Enter sends · Shift+Enter newlines
        ├── AttachmentPicker (Sheet)  lab result · camera · gallery · document
        └── VoiceRecorder (inline)    timer, cancel, send
```

### Responsibilities

| Component | Owns | Does **not** own |
|---|---|---|
| `ChatScreen` | wiring the socket hook to the upload hook; object-URL lifetime | any layout or fetch logic |
| `useChatSocket` | transcript state, acks, typing, presence, history paging | file bytes |
| `useFileUpload` | validation, chunking, progress, cancel/retry | message semantics |
| `MessageList` | scroll behaviour and pagination trigger | message rendering |
| `MessageBubble` | one message's presentation | transport state |
| `Composer` | drafting, picking, recording | uploading or sending |

---

## 2. Realtime layer

`lib/ws/mockSocket.ts` implements the exact wire protocol; `lib/ws/useChatSocket.ts`
consumes it.

```
client → server   message.send · typing.start · typing.stop · read.ack · history.fetch
server → client   message.new · message.ack · typing · read · presence · history.page
```

**Optimistic send.** `sendText` / `sendAttachment` push a bubble with a `clientId` and
status `sending` (or `queued` when the socket is not open), then emit `message.send`.
The server's `message.ack` frames arrive staged — `sent → delivered → read` — and each
one patches the bubble matched by `clientId`. A failed send flips to `failed` and the
bubble grows a "ارسال مجدد" affordance wired to `retryMessage`.

**Typing.** `notifyTyping()` emits `typing.start` at most once, then debounces
`typing.stop` at 1.6 s. Incoming `typing` frames drive `TypingIndicator`.

**Read receipts.** Whenever the last message is from the coach and the socket is open,
the hook emits `read.ack`. Inbound `read` marks every outgoing bubble as read.

**History (REST fallback).** `MessageList` puts an `IntersectionObserver` on a sentinel
above the first bubble. When it enters the pane, `loadOlder()` fetches the next page —
`GET /api/threads/:id/messages?before=<cursor>&limit=12` in production, `chatHistoryPage()`
in the mock. `useLayoutEffect` measures the pane before and after the prepend and
restores `scrollTop`, so the reading position never jumps.

**Going live.** Replace `createMockSocket()` with `new WebSocket(wsUrl)` and point
`loadOlder()` at the real endpoint. No component changes.

---

## 3. The 30 MB attachment pipeline

Enforced in three places so an oversized file never costs the user bandwidth.

```
 ┌─ 1. <input accept> ──────────────────────────────────────────────┐
 │    CHAT_ACCEPT_ATTR limits the OS picker to image/pdf/audio      │
 └──────────────────────────┬───────────────────────────────────────┘
                            ▼
 ┌─ 2. guardFile()  (lib/upload/fileGuards.ts) ─────────────────────┐
 │    · empty file          → "این فایل خالی است…"                  │
 │    · unsupported mime    → "فرمت این فایل پشتیبانی نمی‌شود…"      │
 │    · size > limit        → "حجم فایل ۳۳٫۴ مگابایت است؛ حداکثر…"  │
 │    Runs BEFORE any object URL is created or request opened.      │
 └──────────────────────────┬───────────────────────────────────────┘
                            ▼
 ┌─ 3. server contract ─────────────────────────────────────────────┐
 │    413 on Content-Length > 30 MB; the client shows the same copy │
 └──────────────────────────────────────────────────────────────────┘
```

**Limits** (`fileGuards.ts` is the single source of truth):

| Kind | Ceiling | Typical payload |
|---|---|---|
| `image` | 12 MB | body photos, food photos |
| `audio` | 20 MB | voice notes |
| `pdf` / `lab` | **30 MB** | blood panels, PDF meal plans |
| avatar | 8 MB | profile picture (then cropped to 512² JPEG) |

**Transfer.** `useFileUpload` splits the file into 512 KB chunks and drives them through
a swappable `ChunkTransport`. After each chunk it patches `bytesSent`, `progress` and a
rolling `speedBps`. 512 KB keeps the progress bar visibly moving on a 3G link, and makes
resume-from-chunk-N trivial when the server supports it.

State machine: `validating → uploading → done | error | canceled`, with `retry(id)`
restarting from chunk 0 and `cancel(id)` firing the `AbortController`.

**Handoff to the transcript.** `onComplete` builds an `Attachment` from the finished
task and calls `sendAttachment()`. The screen — not the upload hook — owns the object
URLs handed to the transcript, and revokes them on unmount; the hook revokes only the
previews it created.

**Mock behaviour.** ~1.6 MB/s with jitter (a 30 MB file lands in ~19 s) and a 1-in-90
chunk failure, so the retry path is exercised in development rather than discovered in
production.

---

## 4. Edge cases already handled

- **Offline send** — bubbles queue with a clock icon and an amber banner appears.
- **Same file twice** — the `<input>` value is reset after every pick.
- **Re-entrancy** — `loadOlder()` guards on `loadingOlder` and `hasMore`.
- **Unmount mid-upload** — every `AbortController` is aborted and every object URL revoked.
- **Reduced motion** — all bubble/typing animation is disabled by the global media query.
- **Safe areas** — the composer pads by `env(safe-area-inset-bottom)` for gesture-nav devices.

---

## 5. Production checklist

- [ ] Point `useChatSocket` at `wss://…/v1/threads/:id`, keep the frame shapes.
- [ ] Implement `POST /api/uploads` (init) → `PUT /api/uploads/:id/chunk/:n` → `POST /api/uploads/:id/finalize`.
- [ ] Return a CDN URL from `finalize` and use it in place of the object URL.
- [ ] Mirror the 30 MB ceiling in the gateway (`client_max_body_size 30m`).
- [ ] Scan uploads for malware before the coach can open them — lab PDFs are user-supplied.
- [ ] Encrypt attachments at rest; blood panels are health data.
