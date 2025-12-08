"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Client-side + SW support check
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // If there's already a registration for this script, reuse it
        const existing = await navigator.serviceWorker.getRegistration("/service-worker.js");

        if (existing) {
          console.log("[PWA] Service worker already registered", existing);
          return;
        }

        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });

        console.log("[PWA] Service worker registered", registration);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log("[PWA] New service worker installed & will take over on next reload.");
              } else {
                console.log("[PWA] Service worker installed for the first time.");
              }
            }
          });
        });
      } catch (err) {
        console.error("[PWA] Service worker registration failed", err);
      }
    };

    register();

    // ❌ DO **NOT** unregister here – it kills push & offline every time React unmounts
    return () => {
      // Intentionally empty: we want the service worker to stay registered.
    };
  }, []);

  return null;
}
