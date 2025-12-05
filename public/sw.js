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
  console.log("[sw] push event", event);

  let payload = {};

  if (event.data) {
    try {
      // Try JSON first
      payload = event.data.json();
    } catch (e) {
      try {
        // Fallback to text payload
        const text = event.data.text();
        payload = { title: text };
      } catch {
        // Ignore, will use defaults
        payload = {};
      }
    }
  }

  const title = payload.title || "Task Reminder";
  const body = payload.body || "You have a task coming up.";
  const url = payload.url || "/dashboard";

  const options = {
    body,
    // Make sure these paths exist in /public
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
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
        // Focus *any* existing tab on your origin if possible
        for (const client of clientList) {
          if ("focus" in client) {
            // If you want to be strict, check client.url.includes(urlToOpen)
            return client.focus();
          }
        }
        // Otherwise open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
