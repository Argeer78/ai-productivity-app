"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Ensure this only runs on the client-side and when service worker is supported
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // Register the service worker with the correct scope
        const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });

        console.log("[PWA] Service worker registered", registration);

        // Listen for when a new service worker is found and installed
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              console.log("[PWA] New service worker installed");

              // Optional: Prompt to skip waiting and activate the new service worker immediately
              if (navigator.serviceWorker.controller) {
                console.log("[PWA] New service worker is now active.");
              } else {
                // Only prompt for the user to refresh or take control if the service worker is new
                console.log("[PWA] A new service worker is available, but still in the waiting phase.");
              }
            }
          });
        });
      } catch (err) {
        console.error("[PWA] Service worker registration failed", err);
      }
    };

    register();

    // Optional cleanup to unregister the service worker (if needed in future)
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }
    };
  }, []);

  return null;
}
