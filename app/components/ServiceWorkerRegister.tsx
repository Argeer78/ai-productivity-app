"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" }
        );

        console.log("[PWA] Service worker registered", registration);

        // 🔁 If there's already a waiting SW, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log("[PWA] New service worker installed → reloading");
                window.location.reload();
              }
            }
          });
        });

        // 🔄 Reload once when controller changes
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          console.log("[PWA] Controller changed → reloading");
          window.location.reload();
        });
      } catch (err) {
        console.error("[PWA] Service worker registration failed", err);
      }
    };

    register();
  }, []);

  return null;
}
