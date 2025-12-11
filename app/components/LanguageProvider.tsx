// app/components/LanguageProvider.tsx
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
  type Lang,
  DEFAULT_LOCALE,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";

type LanguageContextValue = {
  lang: Lang;
  label?: string;
  setLang: (l: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const LS_KEY = "aiprod_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LOCALE);

  // 1) Load from localStorage first (fast, no auth needed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      window.localStorage.getItem(LS_KEY) ||
      window.localStorage.getItem("uiLang"); // old key fallback
    if (
      stored &&
      SUPPORTED_LANGS.some((entry) => entry.code === stored)
    ) {
      setLangState(stored as Lang);
    }
  }, []);

  // 2) Then try to override with profiles.ui_language if user is logged in
  useEffect(() => {
    let cancelled = false;

    async function loadFromProfile() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user || cancelled) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("ui_language")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[LanguageProvider] load ui_language error", error);
          return;
        }

        const dbLang = profile?.ui_language as Lang | null;

        if (
          dbLang &&
          SUPPORTED_LANGS.some((entry) => entry.code === dbLang)
        ) {
          if (!cancelled) {
            setLangState(dbLang);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(LS_KEY, dbLang);
              window.localStorage.setItem("uiLang", dbLang); // keep RTL in sync
            }
          }
        }
      } catch (err) {
        console.error("[LanguageProvider] loadFromProfile error", err);
      }
    }

    loadFromProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  function setLang(l: Lang) {
    setLangState(l);

    // Persist in localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, l);
      // Also mirror to uiLang so RtlDirectionManager picks it up
      window.localStorage.setItem("uiLang", l);
    }

    // Persist in Supabase profile (best effort)
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) return;

        const { error } = await supabase
          .from("profiles")
          .update({ ui_language: l })
          .eq("id", user.id);

        if (error) {
          console.error("[LanguageProvider] update ui_language error", error);
        }
      } catch (err) {
        console.error("[LanguageProvider] setLang error", err);
      }
    })();
  }

  const currentMeta = SUPPORTED_LANGS.find((entry) => entry.code === lang);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        label: currentMeta?.label,
        setLang,
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
