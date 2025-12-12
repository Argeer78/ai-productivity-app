// lib/useUiI18n.ts
"use client";

import { useEffect, useState } from "react";

type UiTranslationsResponse = {
  ok: boolean;
  languageCode: string;
  translations: Record<string, string>;
  error?: string;
};

export function useUiI18n(initialLanguage?: string) {
  const [lang, setLang] = useState(initialLanguage || "en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/ui-translations/${lang}`);
        const data = (await res.json().catch(() => null)) as
          | UiTranslationsResponse
          | null;

        if (!res.ok || !data?.ok) {
          if (!cancelled) {
            setError(data?.error || `Failed to load translations (${res.status})`);
          }
          return;
        }

        if (!cancelled) {
          setTranslations(data.translations || {});
        }
      } catch (err) {
        console.error("[useUiI18n] load error", err);
        if (!cancelled) {
          setError("Network error while loading translations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  function t(key: string): string {
    return translations[key] ?? key;
  }

  return { lang, setLang, t, loading, error };
}