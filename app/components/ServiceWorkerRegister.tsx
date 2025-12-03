"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" }
        );

        console.log("[PWA] Service worker registered", registration);

        // Optional: log when a new SW is installed
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              console.log("[PWA] New service worker installed");
            }
          });
        });
      } catch (err) {
        console.error("[PWA] Service worker registration failed", err);
      }
    };

    register();
  }, []);

  return null;
}
