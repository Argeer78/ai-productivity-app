// app/components/RtlDirectionManager.tsx
"use client";

import { useEffect, useState } from "react";
import { Locale, SUPPORTED_LANGS, isRTL } from "@/lib/i18n";

const LS_KEY = "aiprod_lang";

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem(LS_KEY);
  if (stored && SUPPORTED_LANGS.some((l) => l.code === stored)) {
    return stored as Locale;
  }

  // Fallback to English
  return "en";
}

export function RtlDirectionManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale);

  // Watch for language changes (localStorage + custom event)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncLocaleFromStorage = () => {
      const stored = window.localStorage.getItem(LS_KEY);
      if (
        stored &&
        SUPPORTED_LANGS.some((l) => l.code === stored) &&
        stored !== locale
      ) {
        setLocale(stored as Locale);
      }
    };

    // Initial sync in case LanguageProvider already set it
    syncLocaleFromStorage();

    // Fired when localStorage changes in *other* tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        syncLocaleFromStorage();
      }
    };

    // Fired in the *same* tab by LanguageProvider (we'll add that below)
    const onCustom = () => {
      syncLocaleFromStorage();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("aiprod_lang_change", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("aiprod_lang_change", onCustom as EventListener);
    };
  }, [locale]);

  // Apply dir + lang to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.lang = locale;
    html.dir = isRTL(locale) ? "rtl" : "ltr";
  }, [locale]);

  return <>{children}</>;
}
