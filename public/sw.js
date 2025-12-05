// -------------------------------
// AI Productivity Hub Service Worker
// - Offline fallback + push notifications
// -------------------------------

const CACHE_NAME = "aiprod-cache-v1";
const OFFLINE_URL = "/offline.html";

// --------------------------------------------------
// INSTALL — Cache offline fallback
// --------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

// --------------------------------------------------
// ACTIVATE — Remove old caches
// --------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// --------------------------------------------------
// FETCH — Offline fallback for navigations + cache-first for GET
// --------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1) Navigation (page loads)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(OFFLINE_URL)) ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })()
    );
    return;
  }

  // 2) Same-origin GET → cache-first
  if (request.method === "GET" && request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => new Response("", { status: 408 }));
      })
    );
  }
});

// --------------------------------------------------
// MESSAGE — Allow skipWaiting
// --------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// --------------------------------------------------
// 🔔 PUSH NOTIFICATIONS — Show reminders from backend
// --------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};

  try {
    if (event.data) {
      try {
        // First try JSON
        data = event.data.json();
      } catch {
        // Fallback to plain text
        const text = event.data.text();
        data = {
          title: text || "Task Reminder",
          body: "",
        };
      }
    } else {
      // No payload at all (some push services do this)
      data = {
        title: "Task Reminder",
        body: "You have something to review.",
      };
    }
  } catch (e) {
    // Absolute last resort
    console.error("[sw] push event parsing error:", e);
    data = {
      title: "Task Reminder",
      body: "You have something to review.",
    };
  }

  const title = data.title || "Task Reminder";
  const body = data.body || "You have something to review.";
  const url = data.url || "/dashboard";

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [80, 40, 80],
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --------------------------------------------------
// 🔔 CLICK — Navigate to relevant task
// --------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(urlToOpen));
        if (existing) {
          return existing.focus();
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
