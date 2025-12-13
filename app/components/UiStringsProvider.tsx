"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLanguage } from "@/app/components/LanguageProvider";

type Ctx = {
  lang: string;
  dict: Record<string, string>;
  t: (key: string, fallback?: string) => string;
  loading: boolean;
  error: string | null;
};

const UiStringsContext = createContext<Ctx | null>(null);

export function UiStringsProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [dict, setDict] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/ui-translations/${lang}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error || `Failed to load UI translations (${res.status})`
          );
        }

        if (!cancelled) setDict(json.translations || {});
      } catch (e: any) {
        console.error("[UiStringsProvider] load error:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load UI translations");
          setDict({});
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

  const t = (key: string, fallback?: string) => {
    const v = dict[key];
    if (typeof v === "string" && v.length > 0) return v;
    return fallback ?? key;
  };

  const value = useMemo(
    () => ({ lang, dict, t, loading, error }),
    [lang, dict, loading, error]
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
