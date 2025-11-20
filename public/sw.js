// public/sw.js

self.addEventListener("install", (event) => {
  // Take control immediately after install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim clients so it's active on first load
  event.waitUntil(self.clients.claim());
});

// Minimal fetch handler (Chrome expects some fetch logic for PWA)
self.addEventListener("fetch", () => {
  // You can add caching logic here later if you want
});
