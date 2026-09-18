# Gateway — realtime chat & media

> `server/` · Node 22 · Express + Socket.io · S3/MinIO · JWT RBAC
> `cd server && npm install && npm run dev` → `http://localhost:4000`

A single process serving three things: the consultation socket, the media
pipeline, and the RBAC-guarded REST surface the three portals read.

---

## 1. Layout

```
server/src/
├── config/          env parsed once, at boot, with zod
├── auth/            roles · permissions · JWT · express middleware
├── db/              Repository interface + in-memory implementation
├── realtime/        protocol · presence · Socket.io gateway
├── storage/         MIME allowlist · object store · upload + avatar pipelines
├── http/            app wiring · attachment staging · routes/
└── main.ts          composition root + graceful shutdown
```

Every dependency is injected. `createApp()` and `createGateway()` take their
collaborators as arguments, which is why the test suite can boot the whole
stack on an ephemeral port with an in-memory bucket and no containers.

---

## 2. RBAC

Three roles — `client`, `specialist`, `admin` — and a permission table in
`auth/roles.ts`. Routes check a *permission*, never a role name, so a future
read-only operator can be granted `admin:analytics` without also seeing
`admin:users`.

Role is necessary but never sufficient for a consultation. `canAccessThread`
also requires the principal to be a participant, and it is enforced twice:

- REST — `requireThreadAccess()` on every `/threads/:id/*` route.
- Socket — a socket is only added to `thread:<id>` after the same check, so a
  broadcast **physically cannot** reach a non-participant. Room membership is
  the security boundary, not a filter applied afterwards.

Tokens are short-lived JWTs (`sub`, `role`, `name`, `threads`). There is no
sign-in yet, so `POST /api/v1/auth/dev-token` mints one — and refuses outright
when `NODE_ENV=production`.

---

## 3. Consultation protocol

`realtime/protocol.ts` is the single definition, typed on both ends.

```
client → server   thread:join · thread:leave · message:send
                  typing:start · typing:stop · read:ack · heartbeat:ping
server → client   connection:ready · message:new · message:ack
                  typing · read · presence · error
```

**Liveness.** Engine.io pings every 25 s with a 20 s timeout, so a half-open
mobile connection is reaped in ~45 s instead of lingering as a phantom
participant. `heartbeat:ping` sits on top for the client's own latency badge.

**Presence** is connection-counted, not a flag: a user is online while at least
one socket is attached, which is what stops a second tab — or a reconnect that
races the old socket's disconnect — from reporting them offline.

**Receipts** stage `sent → delivered → read`. `delivered` is emitted only once
another socket is actually in the room; `read:ack` carries a sequence number so
a client that was away marks everything it missed in one call.

---

## 4. Media

### The 30 MB ceiling, enforced three ways

| Order | Where | What it stops |
|---|---|---|
| 1 | `Content-Length` precheck | an oversized request before a socket to the bucket is opened |
| 2 | busboy `limits.fileSize` | the file stream itself |
| 3 | a byte counter on the pass-through | a chunked request that lies about, or omits, its length |

Nothing is buffered: bytes stream from busboy straight into `PutObject`. When
the guard trips mid-flight the pipeline is destroyed **and** the partial object
is deleted, so a rejected upload leaves nothing behind.

### Type safety

The multipart `Content-Type` is attacker-controlled, so a declared type must
both be on the allowlist *and* match the magic number of the first 16 bytes.
`evil.pdf` containing HTML is rejected with 415.

### Two-phase attachment

REST receives the bytes and parks the record in staging; the socket's
`message:send` claims it exactly once, and only for the account that uploaded
it. Binary never travels over the websocket, and an unclaimed upload expires
instead of leaving an orphan row in the thread.

### Presigned downloads

Attachments are never public. Every URL is minted per request with a 5-minute
TTL; a long-open transcript re-mints through
`GET /api/v1/messages/:id/attachment`. Only `avatars/` is eligible for the CDN.

### Avatars

The client crops before sending, but the server re-derives 512/256/96 WebP
renditions from the received bytes with `sharp` — a client is not a trust
boundary, and this also strips EXIF (including GPS). `sharp` is loaded lazily:
a deployment that cannot install its binaries degrades to "stored as received"
rather than taking chat down with it.

---

## 5. REST surface

| Method | Path | Permission |
|---|---|---|
| `POST` | `/api/v1/auth/dev-token` | — (dev only) |
| `GET` | `/api/v1/threads` | `chat:read` |
| `GET` | `/api/v1/threads/:id/messages?before=&limit=` | `chat:read` + participant |
| `POST` | `/api/v1/threads/:id/attachments` | `media:upload` + participant |
| `GET` | `/api/v1/messages/:id/attachment` | `media:download` + participant |
| `POST` `DELETE` | `/api/v1/me/avatar` | `avatar:write` |
| `GET` | `/api/v1/admin/overview` | `admin:analytics` |
| `GET` | `/api/v1/admin/users`, `/users/:id` | `admin:users` |
| `GET` | `/api/v1/admin/specialists` | `admin:specialists` |
| `GET` | `/api/v1/admin/content` | `admin:content` |
| `POST` | `/api/v1/admin/broadcast` | `admin:broadcast` |
| `GET` | `/healthz` | — |

History is **keyset** over `seq`, not `OFFSET`: a page stays correct while the
other participant keeps sending, and cost does not grow with depth.

---

## 6. Running it

```bash
cd server
cp .env.example .env
npm install
npm run dev        # in-memory bucket if no S3 credentials are set
npm test           # 14 integration tests, no containers needed
```

With storage:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up -d
# gateway http://localhost:4000 · MinIO console http://localhost:9001
```

---

## 7. Before production

- [ ] Swap `InMemoryRepository` for Postgres — the interface in
      `db/repository.ts` is the only thing that changes.
- [ ] Add the Socket.io Redis adapter and back `PresenceTracker` with a shared
      hash; the interface is already shaped for it.
- [ ] Replace `/auth/dev-token` with the real identity provider. Everything
      downstream only ever sees a verified `Principal`.
- [ ] Mirror `MAX_UPLOAD_BYTES` at the ingress (`client_max_body_size 30m`).
- [ ] Virus-scan attachments before a clinician can open them — lab PDFs are
      user-supplied.
- [ ] Encrypt the bucket at rest and set a lifecycle policy; these are medical
      records.
- [ ] Rate-limit `message:send` and the upload route per principal.
