// Full-featured service worker for AI Productivity Hub
// - Offline fallback page
// - Caching for Next.js static assets
// - Basic image caching

// Load Workbox from CDN
importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");

// Optional: reduce noisy logs in production
if (workbox) {
  workbox.setConfig({ debug: false });
}

const OFFLINE_CACHE = "aiprod-offline-v1";
const STATIC_CACHE = "aiprod-static-v1";
const IMAGE_CACHE = "aiprod-images-v1";
const OFFLINE_PAGE = "/offline.html";

// Install: pre-cache the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll([OFFLINE_PAGE]);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [OFFLINE_CACHE, STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// 1) Handle navigation requests with Network First + offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Use any preload response if available
          const preloadResp = await event.preloadResponse;
          if (preloadResp) {
            return preloadResp;
          }

          // Try network first
          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          // If offline or network fails, use offline.html
          const cache = await caches.open(OFFLINE_CACHE);
          const cachedResp = await cache.match(OFFLINE_PAGE);
          if (cachedResp) return cachedResp;

          // As a last resort, fall back to a basic Response
          return new Response("You are offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
  }
});

// Enable navigation preload if supported
if (self.registration && self.registration.navigationPreload) {
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.registration.navigationPreload.enable());
  });
}

// 2) Cache Next.js static assets (/_next/static/*) with StaleWhileRevalidate
if (workbox) {
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith("/_next/static/"),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: STATIC_CACHE,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );

  // 3) Cache images (PNG, JPG, SVG, ICO) with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === "image" ||
      url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: IMAGE_CACHE,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
}

// Support for manual skipWaiting messages (optional)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
