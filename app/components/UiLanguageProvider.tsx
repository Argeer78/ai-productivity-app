"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  UiLanguage,
  getBrowserLanguage,
  getStoredUiLanguage,
  onUiLanguageChange,
  setStoredUiLanguage,
} from "@/lib/uiLanguage";

type Ctx = {
  uiLang: UiLanguage;
  setUiLang: (lang: UiLanguage) => void;
};

const UiLanguageContext = createContext<Ctx | null>(null);

export function UiLanguageProvider({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLangState] = useState<UiLanguage>("en");

  useEffect(() => {
    // initial language: localStorage → browser → en
    const initial = getStoredUiLanguage() || getBrowserLanguage();
    setUiLangState(initial);

    // listen for changes triggered by picker (instant translations)
    return onUiLanguageChange((lang) => setUiLangState(lang));
  }, []);

  const setUiLang = (lang: UiLanguage) => {
    setUiLangState(lang);
    setStoredUiLanguage(lang);
  };

  const value = useMemo(() => ({ uiLang, setUiLang }), [uiLang]);

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const ctx = useContext(UiLanguageContext);
  if (!ctx) throw new Error("useUiLanguage must be used inside UiLanguageProvider");
  return ctx;
}
