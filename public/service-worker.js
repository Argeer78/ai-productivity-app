// -------------------------------
// AI Productivity Hub Service Worker
// - Offline fallback + push notifications
// -------------------------------

const CACHE_VERSION = "v5"; // ⬅️ bump this on deploys
const CACHE_NAME = `aiprod-cache-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [OFFLINE_URL];

// --------------------------------------------------
// INSTALL
// --------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// --------------------------------------------------
// ACTIVATE — clean old caches
// --------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --------------------------------------------------
// FETCH
// --------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.headers.get("range")) return;

  // 🚫 Never cache API requests (let browser handle normally)
  if (url.pathname.startsWith("/api")) return;

  // 🚫 Never cache navigations (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL)) || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // ✅ Cache ONLY static assets
  const isSameOrigin = url.origin === self.location.origin;
  const isStatic =
    request.method === "GET" &&
    isSameOrigin &&
    /\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);

        // ✅ Only cache successful responses
        if (response && response.ok && response.type === "basic") {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, clone);
        }

        return response;
      } catch {
        // ✅ If network fails, try cache (otherwise empty 503)
        const fallback = await caches.match(request);
        return fallback || new Response("", { status: 503 });
      }
    })()
  );
});

// --------------------------------------------------
// MESSAGE — allow skipWaiting
// --------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// --------------------------------------------------
// PUSH NOTIFICATIONS
// --------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Task reminder", body: "" };
  }

  const title = data.title || "Task reminder";
  const body = data.body || "You have something to review.";
  const clickUrl = data?.data?.url || data.url || "https://aiprod.app/tasks";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      vibrate: [80, 40, 80],
      data: { url: clickUrl },
      requireInteraction: true,
      timestamp: Date.now(),
    })
  );
});

// --------------------------------------------------
// NOTIFICATION CLICK
// --------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "https://aiprod.app/tasks";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const targetPath = new URL(target, self.location.origin).pathname;

      const existing = list.find((c) => {
        try {
          return new URL(c.url).pathname === targetPath;
        } catch {
          return false;
        }
      });

      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
