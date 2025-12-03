// public/service-worker.js

// Simple, safe service worker – no heavy caching yet

self.addEventListener("install", (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of open pages
  event.waitUntil(self.clients.claim());
});

// Optional: basic fetch handler (currently passthrough)
self.addEventListener("fetch", () => {
  // You can add custom caching logic here later
});
