/* HelloFit / هلوفیت — offline shell + notification service worker.

   Caching
     · app shell + static assets → stale-while-revalidate
     · navigations               → network-first with an offline fallback
     · API calls                 → network-only (health data is never stale)

   Notifications
     · `push`               → server-sent reminders while the app is closed
     · `message`            → the page asks the worker to show a local
                              notification (no push subscription required)
     · `notificationclick`  → focus an existing client and route it, or open
                              a new window; action buttons are relayed to the
                              page so the store can record them
*/

const VERSION = "hellofit-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/monochrome-512.png",
  "/fonts/IRANYekanX-Regular.woff2",
  "/fonts/IRANYekanX-Bold.woff2",
  "/brand/hellofit-logo.svg",
];

/* ------------------------------ lifecycle ------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // A single failed entry must not abort the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* -------------------------------- fetch --------------------------------- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Writes that fail offline are queued and replayed by background sync.
  // Uploads are excluded: a 30 MB body has no business sitting in a Cache,
  // and the client already re-drives those through its own retry UI.
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    if (url.pathname.startsWith("/api/") && !url.pathname.includes("/attachments") && !url.pathname.includes("/avatar")) {
      event.respondWith(
        fetch(request.clone()).catch(async () => {
          await queueRequest(request);
          return new Response(JSON.stringify({ queued: true }), {
            status: 202,
            headers: { "content-type": "application/json" },
          });
        }),
      );
    }
    return;
  }

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Never cache API or realtime traffic — health data must be fresh.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          // A successful navigation proves we are online; drain anything queued.
          event.waitUntil(replayOutbox().catch(() => {}));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/* ---------------------------- notifications ------------------------------ */

const CHANNEL_DEFAULTS = {
  meals: { icon: "/icons/shortcut-diet.png", tag: "hellofit-meals" },
  supplements: { icon: "/icons/icon-192.png", tag: "hellofit-supplements" },
  workout: { icon: "/icons/shortcut-workout.png", tag: "hellofit-workout" },
  chat: { icon: "/icons/shortcut-chat.png", tag: "hellofit-chat" },
};

/**
 * Builds the options object once so `push` and `message` produce identical
 * notifications. `renotify` needs a `tag`, so the tag is always set.
 */
function buildNotification(payload) {
  const channel = payload.channel && CHANNEL_DEFAULTS[payload.channel];
  const tag = payload.tag || (channel ? channel.tag : "hellofit");

  return {
    title: payload.title || "هلوفیت",
    options: {
      body: payload.body || "",
      icon: (channel && channel.icon) || "/icons/icon-192.png",
      badge: "/icons/monochrome-512.png",
      dir: "rtl",
      lang: "fa-IR",
      tag,
      renotify: Boolean(payload.renotify),
      requireInteraction: Boolean(payload.requireInteraction),
      silent: Boolean(payload.silent),
      timestamp: payload.at || Date.now(),
      vibrate: payload.silent ? undefined : [40, 30, 40],
      actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : undefined,
      data: {
        url: payload.url || "/",
        channel: payload.channel || "chat",
        key: payload.key || null,
        id: payload.id || null,
      },
    },
  };
}

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "هلوفیت", body: event.data.text() };
    }
  }

  const { title, options } = buildNotification(payload);
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => relay({ type: "push-received", payload })),
  );
});

/**
 * The page drives local reminders: it knows the plan schedule and stays the
 * source of truth, the worker just renders. This is what makes reminders work
 * without a push subscription or a VAPID key.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHOW_NOTIFICATION") {
    const { title, options } = buildNotification(data.payload || {});
    event.waitUntil(self.registration.showNotification(title, options));
    return;
  }

  if (data.type === "CLOSE_NOTIFICATIONS") {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: data.tag })
        .then((list) => list.forEach((n) => n.close())),
    );
    return;
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** Tells every open tab what happened, so the in-app inbox stays in sync. */
function relay(message) {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => clients.forEach((client) => client.postMessage(message)));
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  // An action button resolves in place — no navigation.
  if (event.action) {
    event.waitUntil(relay({ type: "notification-action", action: event.action, data }));
    return;
  }

  const target = new URL(data.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      relay({ type: "notification-click", data });
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

/* --------------------------- background sync ----------------------------- */

const OUTBOX_TAG = "hellofit-outbox";
const OUTBOX_CACHE = `${VERSION}-outbox`;

/**
 * Queued writes that failed while offline.
 *
 * Requests are parked in a Cache (the only storage a worker can rely on
 * without IndexedDB plumbing) keyed by a synthetic URL, then replayed when the
 * platform says the network is back. `sync` fires even if the app was closed
 * in between, which is the whole point — a reminder ticked on the metro is not
 * lost because the tab was killed in the tunnel.
 */
async function queueRequest(request) {
  const cache = await caches.open(OUTBOX_CACHE);
  const body = await request.clone().arrayBuffer();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await cache.put(
    new Request(`https://outbox.local/${stamp}`),
    new Response(body, {
      headers: {
        "x-target-url": request.url,
        "x-target-method": request.method,
        "x-target-content-type": request.headers.get("content-type") || "application/json",
        "x-target-auth": request.headers.get("authorization") || "",
      },
    }),
  );
  if ("sync" in self.registration) {
    try {
      await self.registration.sync.register(OUTBOX_TAG);
    } catch {
      // Sync unavailable (Safari, or permission denied) — replayOutbox() also
      // runs on the next successful navigation, so nothing is stranded.
    }
  }
}

async function replayOutbox() {
  const cache = await caches.open(OUTBOX_CACHE);
  const keys = await cache.keys();
  let flushed = 0;

  for (const key of keys) {
    const stored = await cache.match(key);
    if (!stored) continue;

    const url = stored.headers.get("x-target-url");
    const method = stored.headers.get("x-target-method") || "POST";
    const contentType = stored.headers.get("x-target-content-type");
    const auth = stored.headers.get("x-target-auth");
    if (!url) {
      await cache.delete(key);
      continue;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "content-type": contentType || "application/json",
          ...(auth ? { authorization: auth } : {}),
        },
        body: await stored.arrayBuffer(),
      });
      // 4xx means the server rejected it on the merits; retrying forever would
      // never succeed, so drop it and let the client resurface the error.
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await cache.delete(key);
        flushed += 1;
      }
    } catch {
      // Still offline — leave it queued for the next sync.
      break;
    }
  }

  if (flushed > 0) await relay({ type: "outbox-flushed", count: flushed });
  return flushed;
}

self.addEventListener("sync", (event) => {
  if (event.tag === OUTBOX_TAG) event.waitUntil(replayOutbox());
});

/** Periodic sync, where granted: refresh the plan so a cold open is current. */
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "hellofit-refresh") {
    event.waitUntil(relay({ type: "periodic-refresh" }));
  }
});

self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};
  event.waitUntil(relay({ type: "notification-dismissed", data }));
});
