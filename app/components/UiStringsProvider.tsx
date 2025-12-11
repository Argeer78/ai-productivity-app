// app/components/UiStringsProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import type { Locale } from "@/lib/i18n";

type UiStringsContextValue = {
  lang: Locale;
  translations: Record<string, string>;
  loading: boolean;
  error: string | null;
};

const UiStringsContext = createContext<UiStringsContextValue | undefined>(
  undefined
);

export function UiStringsProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ui-translations/${lang}`);
        const json = await res.json().catch(() => null as any);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load translations");
        }

        if (!cancelled) {
          setTranslations(json.translations || {});
        }
      } catch (err: any) {
        console.error("[UiStringsProvider] load error", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load translations");
          setTranslations({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return (
    <UiStringsContext.Provider
      value={{ lang, translations, loading, error }}
    >
      {children}
    </UiStringsContext.Provider>
  );
}

export function useUiStrings(): UiStringsContextValue {
  const ctx = useContext(UiStringsContext);
  if (!ctx) {
    throw new Error("useUiStrings must be used inside <UiStringsProvider>");
  }
  return ctx;
}
