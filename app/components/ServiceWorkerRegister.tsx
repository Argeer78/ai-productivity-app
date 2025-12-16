// app/components/ServiceWorkerRegister.tsx
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Optional: allow debugging link to bypass SW register
    if (new URLSearchParams(window.location.search).has("nosw")) return;

    let mounted = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });

        if (!mounted) return;
        console.log("[PWA] SW registered:", reg);

        // If a new worker is waiting, just log it (don’t force activate + reload)
        if (reg.waiting) {
          console.log("[PWA] SW update waiting (will activate on next load).");
          // If you *really* want immediate activate, do it without reload loops:
          // reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log("[PWA] New SW installed (update ready).");
                // ✅ Don’t reload here. Show a UI “Refresh” button later if you want.
              } else {
                console.log("[PWA] SW installed for first time.");
              }
            }
          });
        });

        // ✅ No controllerchange reload. Avoid loops.
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[PWA] controllerchange");
        });
      } catch (e) {
        console.error("[PWA] SW register failed:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
