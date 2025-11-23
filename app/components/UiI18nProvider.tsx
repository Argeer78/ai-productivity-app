"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LS_UI_LANG = "ui_lang";

type UiLang = string; // or a union of supported codes

type UiI18nContextValue = {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
};

const UiI18nContext = createContext<UiI18nContextValue | undefined>(undefined);

export function UiI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<UiLang>(() => {
    if (typeof window === "undefined") return "en";

    try {
      const saved = window.localStorage.getItem(LS_UI_LANG);
      if (saved) return saved;

      if (navigator.language) {
        const base = navigator.language.split("-")[0].toLowerCase();
        return base || "en";
      }
    } catch {
      // ignore
    }
    return "en";
  });

  // persist when lang changes (this is fine; no warning)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_UI_LANG, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  return (
    <UiI18nContext.Provider value={{ lang, setLang }}>
      {children}
    </UiI18nContext.Provider>
  );
}

export function useUiI18n() {
  const ctx = useContext(UiI18nContext);
  if (!ctx) throw new Error("useUiI18n must be used inside UiI18nProvider");
  return ctx;
}
