// Simple service worker for AI Productivity Hub
// - Caches offline.html
// - Network-first for navigations with offline fallback
// - Basic cache for same-origin GET requests

const CACHE_NAME = "aiprod-cache-v1";
const OFFLINE_URL = "/offline.html";

// Install: cache the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
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

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1) Handle navigations (page loads)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (err) {
          // If offline, show offline page
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          if (cachedResponse) return cachedResponse;

          return new Response("You are offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  // 2) For same-origin GET requests, use cache-first with network fallback
  if (
    request.method === "GET" &&
    request.url.startsWith(self.location.origin)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // If request is for an image, we could return a placeholder here.
            return new Response("", { status: 408 });
          });
      })
    );
  }
});

// Support skipWaiting via postMessage
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
