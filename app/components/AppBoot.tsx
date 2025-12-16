"use client";

import { useEffect, useState } from "react";
import { isFacebookInAppBrowser } from "@/lib/isInAppBrowser";

export default function AppBoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 🚨 Facebook / Instagram browser = skip SW wait
      if (isFacebookInAppBrowser()) {
        setReady(true);
        return;
      }

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
