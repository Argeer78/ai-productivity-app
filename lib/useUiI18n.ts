// lib/useUiI18n.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UiTranslationsResponse = {
  ok: boolean;
  languageCode: string;
  translations: Record<string, string>;
  error?: string;
};

const LS_KEY = "aiprod_lang";

/**
 * storage event does NOT fire in the same tab that writes localStorage.
 * We'll use:
 * - storage event (other tabs)
 * - focus/visibility change (same tab, common)
 * - a small polling fallback (same tab, always works)
 */
function readPreferredLang(initial?: string) {
  if (initial) return initial;
  if (typeof window === "undefined") return "en";
  return (
    window.localStorage.getItem(LS_KEY) ||
    window.localStorage.getItem("uiLang") ||
    "en"
  );
}

async function loadFromLocalJson(lang: string): Promise<Record<string, string> | null> {
  try {
    const mod = await import(`@/languages/${lang}.json`);
    const data = (mod as any).default ?? mod;
    if (data && typeof data === "object") return data as Record<string, string>;
    return null;
  } catch {
    return null;
  }
}

async function loadFromApi(lang: string): Promise<Record<string, string>> {
  const url = new URL("/api/ui-i18n", window.location.origin);
  url.searchParams.set("lang", lang);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as UiTranslationsResponse | null;

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Failed to load ui-i18n (${res.status})`);
  }

  return data.translations || {};
}

export function useUiI18n(initialLanguage?: string) {
  const [lang, setLang] = useState(() => readPreferredLang(initialLanguage));
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const inFlight = useRef(0);

  // Keep hook lang in sync with localStorage changes (same tab + other tabs)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyLatest = () => {
      const next = readPreferredLang(initialLanguage);
      setLang((prev) => (prev === next ? prev : next));
    };

    // Other tabs
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY || e.key === "uiLang") applyLatest();
    }

    // Same tab (common patterns)
    function onFocus() {
      applyLatest();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") applyLatest();
    }

    // Poll fallback (covers everything, low cost)
    const interval = window.setInterval(applyLatest, 750);

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [initialLanguage]);

  useEffect(() => {
    let cancelled = false;
    const reqId = ++inFlight.current;

    async function load() {
      setLoading(true);
      setError("");

      try {
        /**
         * ✅ Strategy:
         * 1) Load local JSON (fast) → set immediately if available.
         * 2) Load API (DB + merged fallback) → merge on top (API overrides local).
         *
         * This prevents “lost keys” and allows Supabase to provide extra keys.
         */
        const local = await loadFromLocalJson(lang);

        if (local && !cancelled && reqId === inFlight.current) {
          setTranslations(local);
        }

        const api = await loadFromApi(lang);

        if (!cancelled && reqId === inFlight.current) {
          const merged = {
            ...(local || {}),
            ...(api || {}),
          };
          setTranslations(merged);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled && reqId === inFlight.current) {
          setTranslations({});
          setError(err?.message || "Failed to load translations.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const api = useMemo(() => {
    function t(key: string, fallback?: string): string {
      const v = translations[key];
      if (typeof v === "string" && v.length > 0) return v;
      return fallback ?? key;
    }

    return { lang, setLang, t, loading, error, translations };
  }, [lang, loading, error, translations]);

  return api;
}
