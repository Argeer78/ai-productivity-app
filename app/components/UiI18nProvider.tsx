"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type UiTranslationsMap = Record<string, string>;

type UiI18nContextValue = {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  ready: boolean;
};

const UiI18nContext = createContext<UiI18nContextValue | undefined>(undefined);

const LS_UI_LANG = "aiprod_ui_lang";

export function UiI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>("en");
  const [map, setMap] = useState<UiTranslationsMap>({});
  const [ready, setReady] = useState(false);

  // Load lang from localStorage or browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(LS_UI_LANG);
      if (saved) {
        setLangState(saved);
      } else if (navigator.language) {
        const base = navigator.language.split("-")[0].toLowerCase();
        setLangState(base || "en");
      }
    } catch (err) {
      console.error("[UiI18n] failed to init language", err);
    }
  }, []);

  // Fetch translations when lang changes
  useEffect(() => {
    let cancelled = false;

    async function loadTranslations() {
      setReady(false);

      try {
        const res = await fetch(`/api/ui-i18n?lang=${encodeURIComponent(lang)}`);
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; translations?: UiTranslationsMap; error?: string }
          | null;

        if (!res.ok || !data?.ok || !data.translations) {
          console.warn(
            "[UiI18n] failed to load translations",
            data || { status: res.status }
          );
          if (!cancelled) {
            setMap({});
            setReady(true);
          }
          return;
        }

        if (!cancelled) {
          setMap(data.translations || {});
          setReady(true);
        }
      } catch (err) {
        console.error("[UiI18n] error loading translations", err);
        if (!cancelled) {
          setMap({});
          setReady(true);
        }
      }
    }

    loadTranslations();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  function setLang(newLang: string) {
    setLangState(newLang);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_UI_LANG, newLang);
      }
    } catch {
      // ignore
    }
  }

  function t(key: string, fallback?: string): string {
    if (map[key]) return map[key];
    return fallback ?? key;
  }

  const value: UiI18nContextValue = {
    lang,
    setLang,
    t,
    ready,
  };

  return (
    <UiI18nContext.Provider value={value}>
      {children}
    </UiI18nContext.Provider>
  );
}

export function useUiI18n() {
  const ctx = useContext(UiI18nContext);
  if (!ctx) {
    throw new Error("useUiI18n must be used inside UiI18nProvider");
  }
  return ctx;
}
