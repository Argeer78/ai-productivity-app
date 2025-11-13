"use client";

/**
 * Very simple analytics helper.
 * - Safe on server and client
 * - No external dependencies
 * - Won't crash anything if something goes wrong
 */
export function useAnalytics() {
  function track(name: string, props?: Record<string, any>) {
    // Only do anything in the browser
    if (typeof window === "undefined") return;

    // For now we just log to console in dev.
    // Later you can wire this to Plausible/GA/etc.
    if (process.env.NODE_ENV === "development") {
      console.log("[analytics]", name, props || {});
    }
  }

  return { track };
}
