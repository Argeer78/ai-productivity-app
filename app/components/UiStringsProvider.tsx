"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLanguage } from "@/app/components/LanguageProvider";

type Ctx = {
  lang: string;
  dict: Record<string, string>;
  loading: boolean;
  error: string | null;

  // ✅ canonical translator (always use this)
  t: (key: string, fallback?: string) => string;
};

const UiStringsContext = createContext<Ctx | null>(null);

// in-memory cache to avoid flicker + re-fetching same language constantly
const cache: Record<string, Record<string, string>> = {};

function normalizeLang(raw: string | undefined | null): string {
  const s = (raw || "en").toString().trim().toLowerCase();
  return s.split("-")[0] || "en";
}

export function UiStringsProvider({ children }: { children: React.ReactNode }) {
  const { lang: appLang } = useLanguage();
  const lang = normalizeLang(appLang);

  const [dict, setDict] = useState<Record<string, string>>(() => cache[lang] || {});
  const [loading, setLoading] = useState<boolean>(() => !cache[lang]);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    // If we already have cached dict for this lang, show instantly (no flicker)
    if (cache[lang]) {
      setDict(cache[lang]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
      setDict({});
    }

    async function load() {
      try {
        // cancel previous request (important when switching lang quickly)
        if (inFlight.current) inFlight.current.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        const res = await fetch(`/api/ui-translations/${lang}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error || `Failed to load UI translations (${res.status})`
          );
        }

        const translations: Record<string, string> = json.translations || {};
        cache[lang] = translations;

        if (!cancelled) {
          setDict(translations);
          setError(null);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("[UiStringsProvider] load error:", e);

        if (!cancelled) {
          setError(e?.message || "Failed to load UI translations");
          // keep whatever we had (cached) instead of nuking UI to keys
          setDict(cache[lang] || {});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      // do not abort here globally; allow next effect to abort
    };
  }, [lang]);

  const t = useMemo(() => {
    return (key: string, fallback?: string) => {
      const v = dict[key];
      if (typeof v === "string" && v.length > 0) return v;
      if (typeof fallback === "string") return fallback;
      return key;
    };
  }, [dict]);

  const value = useMemo<Ctx>(
    () => ({ lang, dict, loading, error, t }),
    [lang, dict, loading, error, t]
  );

  return (
    <UiStringsContext.Provider value={value}>
      {children}
    </UiStringsContext.Provider>
  );
}

export function useUiStrings() {
  const ctx = useContext(UiStringsContext);
  if (!ctx) throw new Error("useUiStrings must be used inside <UiStringsProvider>");
  return ctx;
}
