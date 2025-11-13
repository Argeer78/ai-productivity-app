"use client";

import { usePlausible } from "next-plausible";

/**
 * Tiny wrapper around Plausible so the rest of the app
 * can just call track("event_name", { optional: "props" }).
 */
export function useAnalytics() {
  const plausible = usePlausible();

  return {
    track: (name: string, props?: Record<string, any>) => {
      try {
        // Plausible expects: plausible("event-name", { props: {...} })
        plausible(name as any, props ? { props } : undefined);
      } catch (e) {
        // Never break the UI because of analytics
        console.error("Analytics error:", e);
      }
    },
  };
}
