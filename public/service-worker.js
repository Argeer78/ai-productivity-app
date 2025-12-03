// public/service-worker.js

const STATIC_CACHE = "static-v1";

self.addEventListener("install", (event) => {
  // Take control immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Cache-only static assets (JS, CSS, images, fonts) from *this* origin
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only same-origin assets (won't touch Supabase or external APIs)
  if (url.origin !== self.location.origin) return;

  const dest = request.destination;

  const isStaticAsset = [
    "script",
    "style",
    "image",
    "font",
  ].includes(dest);

  if (!isStaticAsset) {
    // Let the browser handle everything else normally
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // If offline and we have cache, use it
          return cached;
        });

      // Stale-while-revalidate behavior
      return cached || networkFetch;
    })()
  );
});
