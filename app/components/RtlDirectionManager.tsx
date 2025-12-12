"use client";

import { useEffect, useState } from "react";
import { Locale, SUPPORTED_LANGS, isRTL } from "@/lib/i18n";

const LS_KEY = "aiprod_lang"; // 🔥 same as LanguageProvider

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem(LS_KEY);
  if (stored && SUPPORTED_LANGS.some((l) => l.code === stored)) {
    return stored as Locale;
  }

  return "en";
}

export function RtlDirectionManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkLang = () => {
      const stored = window.localStorage.getItem(LS_KEY);
      if (
        stored &&
        SUPPORTED_LANGS.some((l) => l.code === stored) &&
        stored !== locale
      ) {
        setLocale(stored as Locale);
      }
    };

    // Initial check
    checkLang();

    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        checkLang();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [locale]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const rtl = isRTL(locale);

    html.lang = locale;
    html.dir = rtl ? "rtl" : "ltr";
  }, [locale]);

  return <>{children}</>;
}
