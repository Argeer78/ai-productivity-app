// app/components/ServiceWorkerRegister.tsx
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[sw] registered with scope:", reg.scope);
      })
      .catch((err) => {
        console.error("[sw] register error", err);
      });
  }, []);

  return null;
}
