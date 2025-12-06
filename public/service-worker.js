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
  self.skipWaiting();  // Activate the service worker immediately
});

// --------------------------------------------------
// ACTIVATE — Remove old caches
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
  self.clients.claim();  // Claim all open clients (pages)
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
          return await fetch(request); // Try to fetch from the network
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
        if (cached) return cached;  // Serve from cache if available

        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));  // Cache response
            return response;
          })
          .catch(() => new Response("", { status: 408 }));  // Fallback if offline
      })
    );
  }
});

// --------------------------------------------------
// MESSAGE — Allow skipWaiting (manual service worker update trigger)
// --------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();  // Trigger service worker to take control immediately
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
        // Try to parse the data as JSON (expects payload to be JSON)
        data = event.data.json();
      } catch (e) {
        // If JSON parsing fails, treat it as plain text
        console.error("[SW] Push event data parsing error", e);
        const text = event.data.text();
        data = {
          title: text || "Task reminder",  // Default title if text is empty
          body: "",
        };
      }
    } else {
      // Fallback when no push data is provided
      data = {
        title: "Task reminder",
        body: "You have something to review.",
      };
    }
  } catch (e) {
    console.error("[SW] Push event handling error:", e);
    data = {
      title: "Task reminder",
      body: "You have something to review.",
    };
  }

  // Extract notification details (fallback values if missing)
  const title = data.title || "Task reminder";
  const body = data.body || "You have something to review.";

  // Check if the server provides a URL to open when the notification is clicked
  const urlFromNested =
    data.data && (data.data.url || data.data.link || data.data.path);
  const urlFromRoot = data.url || data.link || data.path;
  const url = urlFromNested || urlFromRoot || "https://aiprod.app/tasks"; // Default URL

  const taskId =
    (data.data && data.data.taskId) ||
    data.taskId ||
    null;

  // Notification options (body, icon, vibration pattern, etc.)
  const options = {
    body,
    icon: "/icons/icon-192.png",  // Ensure this icon exists in /public/icons
    badge: "/icons/icon-96.png",  // Badge icon for the notification
    vibrate: [80, 40, 80],
    data: {
      url,
      taskId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));  // Show the notification
});

// --------------------------------------------------
// 🔔 CLICK — Navigate to relevant task
// --------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();  // Close the notification when clicked

  // Use the URL stored in the notification data or fall back to the default
  const urlToOpen =
    (event.notification.data && event.notification.data.url) ||
    "https://aiprod.app/tasks";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing client (tab) with the same URL
      const existing = clientList.find((c) =>
        c.url.includes(new URL(urlToOpen, self.location.origin).pathname)
      );

      // If such a client exists, focus on it
      if (existing) {
        existing.focus();
        return;
      }

      // Otherwise, open a new window with the target URL
      return clients.openWindow(urlToOpen);
    })
  );
});
