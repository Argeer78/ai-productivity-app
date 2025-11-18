// public/sw.js

self.addEventListener("install", (event) => {
  // You can add pre-caching here if you want
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

// Optional: very simple network-first / fallback strategy
self.addEventListener("fetch", (event) => {
  // You can customize caching here – leaving minimal so it doesn't interfere
});
