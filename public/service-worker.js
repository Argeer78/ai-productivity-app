// -------------------------------
// AI Productivity Hub Service Worker
// - Offline fallback + push notifications
// -------------------------------

const CACHE_VERSION = "v3"; // ⬅️ bump this on deploys
const CACHE_NAME = `aiprod-cache-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  OFFLINE_URL,
];

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
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
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

  // 🚫 Never cache API requests
  if (url.pathname.startsWith("/api")) {
    return;
  }

  // 🚫 Never cache navigations (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_URL);
      })
    );
    return;
  }

  // ✅ Cache ONLY static assets
  if (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    /\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

// --------------------------------------------------
// MESSAGE — allow skipWaiting
// --------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
  const url =
    data?.data?.url ||
    data.url ||
    "https://aiprod.app/tasks";

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    vibrate: [80, 40, 80],
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --------------------------------------------------
// NOTIFICATION CLICK
// --------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://aiprod.app/tasks";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
