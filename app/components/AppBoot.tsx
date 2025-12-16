"use client";

import { useEffect, useState } from "react";

export default function AppBoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Ensure service worker is ready (prevents first-open black/white screen)
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.ready;
        } catch {
          // ignore
        }
      }

      if (!cancelled) setReady(true);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    // 🔒 Stable background = no flash
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
