# Passwordless sign-in

A phone number and a five-digit code. No password to forget, reuse, or leak —
and in Iran a mobile number is already the identity every service uses.

---

## 1. The number is the identity

Users type a number six different ways: `0912…`, `+98912…`, `0098912…`, with
Persian digits, with spaces, with dashes. `features/auth/phone.ts` normalises all
of them to one canonical `+989XXXXXXXXX` **before** it is used as a rate-limit
key, a challenge key or a user identity. Two spellings of the same number must
never become two accounts, and a rate limit keyed on the spelling would be no
limit at all.

Operator prefixes are an explicit allowlist rather than "any `9XX`", so a typo in
the prefix is caught at the edge instead of burning an SMS on a number that
cannot exist.

The browser mirrors this in `src/features/auth/lib/phone.ts` for the keypad's
benefit. The server re-validates everything; nothing on the client is a control.

---

## 2. What stops a five-digit code being guessed

A five-digit code is 100 000 possibilities. That is only safe because of what
surrounds it:

| Control | Value | Where |
|---|---|---|
| Code lifetime | 120s | `OTP_TTL_SECONDS` |
| Wrong attempts before the challenge dies | 5 | `OTP_MAX_ATTEMPTS` |
| Resend cooldown | 120s | `OTP_RESEND_COOLDOWN_SECONDS` |
| Sends per phone | 3 / 10 min | `AUTH_LIMITS.sendPerPhone` |
| Sends per IP | 10 / 10 min | `AUTH_LIMITS.sendPerIp` |
| Verifies per phone | 10 / 10 min | `AUTH_LIMITS.verifyPerPhone` |
| Verifies per IP | 30 / 10 min | `AUTH_LIMITS.verifyPerIp` |

Both entry points are limited on **two independent keys** — the phone number and
the client IP. One key alone is not enough: limiting only the phone lets a
botnet walk the number space, and limiting only the IP lets a distributed
attacker pound one number.

A correct code is single-use: the challenge is deleted on success, so a code
captured in transit cannot be replayed. Codes are stored as a salted, peppered
SHA-256 and compared with `timingSafeEqual`, so a dump of the store — or of the
Redis that replaces it — does not hand an attacker a live login.

The limiters and the challenge store are **per-process**. Behind more than one
node they must move to Redis; the interfaces do not change, but until then a
second node multiplies every limit by the node count.

---

## 3. Session transport

| | Where it lives | Why |
|---|---|---|
| Access token | The SPA's memory | Never in `localStorage`, where an injected script could read it |
| Refresh token | `hf_rt` — httpOnly, `SameSite=Strict`, `Secure`, path `/api/v1/auth` | JavaScript cannot read it, and a cross-site form post cannot silently use it |
| CSRF token | `hf_csrf` — readable, `SameSite=Strict`, path `/` | Double-submit: the page echoes it into `x-csrf-token` |

The CSRF cookie has to be readable to be echoed, so its value is an HMAC over
the session subject. An attacker's origin can neither read ours to copy it nor
forge one.

`POST /auth/refresh` mints a credential, so it checks CSRF first and rotates
both cookies on every use — a stolen refresh cookie has a short useful life.
`POST /auth/logout` clears the cookies whether or not the session still
verifies; logging out must work on an expired session.

**Cookie scope.** The app and the gateway must be same-site. Either serve them
from one origin, or set `COOKIE_DOMAIN=.hellofit.ir` so `app.` can read the CSRF
cookie `api.` set. A cross-origin split without a shared parent domain breaks
`SameSite=Strict` and the cold-boot resume with it.

---

## 4. Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/api/v1/auth/otp/request` | `{ phone }` | `{ expiresIn, resendAfter, masked, devCode? }` |
| `POST` | `/api/v1/auth/otp/verify` | `{ phone, code, deviceId? }` | `{ accessToken, expiresIn, csrfToken, principal }` + cookies |
| `POST` | `/api/v1/auth/refresh` | — (cookie + `x-csrf-token`) | same shape |
| `POST` | `/api/v1/auth/logout` | — | `204` |

`devCode` appears **only** when the SMS provider is `console` and `NODE_ENV` is
not production — that is, only where no real message was sent and there is
nowhere else to read the code from. `createSmsProvider()` refuses to return the
console provider in production, and `loadConfig()` refuses to boot with it.

A 429 carries `Retry-After` in seconds; the client shows the countdown rather
than letting the user hammer a disabled button.

Failure codes the UI branches on: `no_challenge`, `code_expired`, `code_locked`,
`code_mismatch` (with `details.attemptsLeft`), `rate_limited`, `sms_failed`.

---

## 5. First sign-in

An unknown number is registered as a `client` with an empty name. The health
onboarding wizard fills the rest — which is why `OnboardingGate` sits *inside*
`AuthGate` and skips `/auth`: the two redirects would otherwise fight.

---

## 6. Where authorisation actually happens

`AuthGate` and the edge middleware route by role. Neither is a permission check:
the middleware reads `hf_hint`, a non-secret cookie the visitor could write
themselves, and a forged role buys nothing but a screen whose every request the
gateway refuses.

Authorisation is `server/src/auth/roles.ts` — a permission table checked on
every request and every socket join, plus `canAccessThread()` for the
participant check that role alone cannot make.

---

## 7. Configuration

Everything is in `server/.env.example` under **Auth** and **Passwordless SMS
OTP**, validated by zod at boot. In production the process refuses to start if
`JWT_SECRET` is still the placeholder, `OTP_PEPPER` is shorter than 16
characters, or `SMS_PROVIDER` is `console`.

The web app reads `NEXT_PUBLIC_AUTH_MODE`: `live` talks to the gateway, `mock`
emulates the whole flow in the browser so the PWA demo signs in with no backend.
`src/lib/env.ts` refuses `mock` in a production build.

---

## 8. Tests

`server/test/auth.test.ts` covers the parts that are easy to get quietly wrong:
every spelling of one number resolving to one identity, a code working once and
never again, the cooldown, the lockout, registration on first sign-in, a refresh
rejected without the CSRF header, and a malformed number rejected **before** an
SMS is sent.
