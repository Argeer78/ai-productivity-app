"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  SUPPORTED_LANGS,
  translate,
  type Lang,
  type TranslationKey,
} from "@/lib/i18n";

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Load from localStorage on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("aiprod_lang");
    if (
      stored &&
      SUPPORTED_LANGS.some((entry) => entry.code === stored)
    ) {
      setLangState(stored as Lang);
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aiprod_lang", l);
    }
  }

  const tWithLang = (key: TranslationKey, fallback?: string) =>
    translate(lang, key, fallback);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: tWithLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}