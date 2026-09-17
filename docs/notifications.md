# Notification system

> `public/sw.js` · `src/lib/notifications/` · `src/components/notifications/`

Reminders reach the user through the OS when permission allows, and always
through an in-app inbox. There is no push server and no VAPID key: the page
computes what is due and asks the service worker to render it.

---

## 1. Pieces

```
public/sw.js                         push · message · notificationclick · notificationclose
src/lib/notifications/
├── permission.ts                    capability + permission probing, iOS caveat
├── scheduler.ts                     plan  →  today's reminders (pure functions)
├── useNotifications.ts              the driver: ticking loop, delivery, action replies
└── NotificationProvider.tsx         mounts the driver exactly once
src/components/notifications/
├── NotificationPermissionCard.tsx   soft ask · denied fallback · iOS install hint
└── NotificationInbox.tsx            inbox + channel toggles + "next up" preview
```

`NotificationProvider` wraps the app in `layout.tsx`. The driver owns a timer and
a `serviceWorker` message listener, so it must not be mounted per screen —
every consumer reads `useNotificationCenter()`.

---

## 2. Why the page schedules, not the worker

A service worker is killed aggressively between events, so `setTimeout` inside it
is not a reliable alarm. The Notification Triggers API (`showTrigger`) is not
shipped in any stable browser.

So: the page recomputes the day's reminders from the plan on every tick
(30 s, plus a catch-up on `visibilitychange`), and posts a `SHOW_NOTIFICATION`
message to the worker when one comes due. The worker renders it — that path is
the only one that supports action buttons.

Recomputing rather than queueing means a ticked checkbox, an edited plan or a
toggled channel takes effect immediately, and no reminder can be orphaned by
stale state. For reminders while the app is fully closed, the same `push`
handler already accepts a server payload of the identical shape.

**Delivery order**

```
tick ─▶ buildTodaysSchedule()  (pure)
      ─▶ due? not already fired today? not more than 30 min stale?
           ├─ store: notif/push        ← the inbox entry, ALWAYS
           └─ permission granted?
                ├─ yes → registration.active.postMessage(SHOW_NOTIFICATION)
                │        └─ fallback: new Notification() if no worker yet
                └─ no  → in-app only, flagged `inAppOnly`
```

---

## 3. Triggers

| Channel | Source | Fires at | Suppressed when |
|---|---|---|---|
| `meals` | `dietPlan.meals[].timeHint` | the slot's start time | every item in the meal is ticked |
| `supplements` | `supplements[].timeLabel` | the stated time | `reminderOn` is off, or already taken |
| `workout` | today's `WorkoutDay` | 17:30 | rest day, or the day is marked done |
| `chat` | `message.new` from the socket | on arrival | the tab is visible, or the channel is off |

Reminder keys are `kind:id:yyyy-m-d`, recorded in `notifications.firedKeys` and
reset when the calendar day rolls over — a reminder fires at most once a day.
A reminder more than 30 minutes stale is dropped rather than fired late.

Action buttons come back through `notificationclick` → `postMessage` →
the driver, which dispatches the matching store action. "مصرف کردم" ticks the
supplement; "خوردم" completes the meal.

---

## 4. Permission UX

The native prompt is only ever reached from a button in
`NotificationPermissionCard` — a browser permanently blocks a site that calls
`Notification.requestPermission()` on load, so the soft ask comes first.

Three states are handled, and none is a dead end:

- **default** — the soft ask, with what the reminders are for; "بعداً" sets
  `promptDismissed` so it is not repeated.
- **denied** — explains how to unblock it in browser settings, and points at the
  in-app inbox, which keeps recording everything. This is the graceful fallback:
  the plan is never silently missed.
- **iOS Safari tab** — the Notification API exists but can never be granted
  outside an installed app, so the card asks the user to add to the home screen
  instead of firing a prompt that cannot succeed.

---

## 5. Going to real web push

The worker is already the whole client side of it. What remains is server-side:

- [ ] Generate a VAPID key pair; expose the public key to the client.
- [ ] `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
      after permission is granted, and POST the subscription to the API.
- [ ] Send payloads matching `buildNotification()` in `sw.js` — `{title, body, channel, url, key, actions}`.
- [ ] Move schedule computation server-side for reminders while the app is closed;
      the client loop stays as the in-session path and keeps the inbox in sync.
- [ ] Handle `pushsubscriptionchange` and re-register.
