/**
 * Last Human Standing — Service Worker
 *
 * Strategy:
 *  - App shell: cache-first (precached on install, falls back to network).
 *  - /api/*: network-first with cache fallback so users see last-known data
 *    when offline. Mutations are queued for background replay.
 *  - Cross-origin assets: pass through (Google Fonts, etc).
 *
 * Messages from clients:
 *  - { type: "CACHE_GAME_STATE", state: {...} } — stash the latest game state
 *  - { type: "QUEUE_CHECKIN", payload: {...} }  — queue an offline check-in
 *  - { type: "GET_QUEUED_CHECKINS" }            — list queued check-ins
 */

const VERSION = "lhs-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const QUEUE_DB = `${VERSION}-queue`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
];

// ---------- IndexedDB helpers for the offline check-in queue ----------

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("checkins")) {
        db.createObjectStore("checkins", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueCheckin(payload) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkins", "readwrite");
    const store = tx.objectStore("checkins");
    const item = { payload, createdAt: Date.now() };
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueuedCheckins() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkins", "readonly");
    const req = tx.objectStore("checkins").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueuedCheckin(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkins", "readwrite");
    const req = tx.objectStore("checkins").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function replayQueue() {
  const queued = await getQueuedCheckins();
  const results = [];
  for (const item of queued) {
    try {
      const resp = await fetch("/api/checkin/location", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(item.payload),
      });
      if (resp.ok) {
        await removeQueuedCheckin(item.id);
        results.push({ id: item.id, ok: true });
      } else {
        results.push({ id: item.id, ok: false, status: resp.status });
      }
    } catch (e) {
      results.push({ id: item.id, ok: false, error: String(e) });
    }
  }
  return results;
}

// ---------- Lifecycle ----------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Precache shell assets. Add individually so one 404 doesn't break install.
      await Promise.all(
        SHELL_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch {
            // ignore individual asset failures
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old cache versions.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------- Fetch routing ----------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET/POST requests.
  if (url.origin !== self.location.origin) return;

  // API: network-first with cache fallback. POSTs that fail are NOT cached
  // (they're mutations) but the client will surface an offline indicator.
  if (url.pathname.startsWith("/api/")) {
    if (request.method === "GET") {
      event.respondWith(networkFirst(request));
    }
    return; // POST/PUT/DELETE pass through normally
  }

  // Navigation requests: try network, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(navigationFallback(request));
    return;
  }

  // Static assets: cache-first.
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) {
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "offline", offline: true }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) {
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function navigationFallback(request) {
  try {
    const resp = await fetch(request);
    return resp;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match("/index.html")) || (await cache.match("/")) || new Response("Offline", { status: 503 });
  }
}

// ---------- Push notifications ----------
// The server sends VAPID web-push payloads shaped by server/lib/push.js:
// { title, body, icon, badge, data: { type, day } }. Without these two
// listeners a delivered push never renders — this IS the retention loop.

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Last Human Standing";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    tag: payload.data?.type ? `lhs-${payload.data.type}-${payload.data.day ?? ""}` : undefined,
    data: payload.data || {},
    vibrate: [30, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Route by notification type: verdicts/eliminations land on the feed,
  // everything else lands on home.
  const type = event.notification.data?.type;
  const targetPath = type === "verdict" || type === "eliminated" ? "/?screen=feed" : "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "PUSH_CLICKED", data: event.notification.data || {} });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetPath);
    })(),
  );
});

// ---------- Background sync (where supported) ----------

self.addEventListener("sync", (event) => {
  if (event.tag === "replay-checkins") {
    event.waitUntil(
      (async () => {
        const results = await replayQueue();
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: "QUEUE_REPLAYED", results }));
      })(),
    );
  }
});

// ---------- Messages from the page ----------

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case "QUEUE_CHECKIN":
      event.waitUntil(
        (async () => {
          await enqueueCheckin(data.payload);
          // Try to register a sync; if not supported the client will retry manually.
          if ("sync" in self.registration) {
            try {
              await self.registration.sync.register("replay-checkins");
            } catch {
              // ignore
            }
          }
          event.source && event.source.postMessage({ type: "CHECKIN_QUEUED", ok: true });
        })(),
      );
      break;

    case "GET_QUEUED_CHECKINS":
      event.waitUntil(
        (async () => {
          const items = await getQueuedCheckins();
          event.source && event.source.postMessage({ type: "QUEUE_LIST", items });
        })(),
      );
      break;

    case "REPLAY_QUEUE_NOW":
      event.waitUntil(
        (async () => {
          const results = await replayQueue();
          event.source && event.source.postMessage({ type: "QUEUE_REPLAYED", results });
        })(),
      );
      break;

    case "SKIP_WAITING":
      self.skipWaiting();
      break;
  }
});
