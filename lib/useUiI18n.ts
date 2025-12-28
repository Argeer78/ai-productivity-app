// lib/useUiI18n.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UiTranslationsResponse = {
  ok: boolean;
  languageCode: string;
  translations: Record<string, string>;
  error?: string;
};

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

/**
 * Make this hook "controlled":
 * - You pass `lang` from your LanguageProvider
 * - No localStorage polling here (LanguageProvider owns that)
 */
export function useUiI18n(lang: string) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const inFlight = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const reqId = ++inFlight.current;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const local = await loadFromLocalJson(lang);
        const api = await loadFromApi(lang);

        if (!cancelled && reqId === inFlight.current) {
          // ✅ IMPORTANT: local overrides api so English fallbacks from API can't overwrite Greek local strings
          const merged = {
            ...(api || {}),
            ...(local || {}),
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

  return useMemo(() => {
    function t(key: string, fallback?: string): string {
      const v = translations[key];
      if (typeof v === "string" && v.length > 0) return v;
      return fallback ?? key;
    }

    return { lang, t, loading, error, translations };
  }, [lang, loading, error, translations]);
}
