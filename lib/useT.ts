// lib/useT.ts
"use client";

import { useMemo } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useUiI18n } from "@/lib/useUiI18n";

type TFn = (key: string, fallback?: string) => string;

function buildScopedT(raw: (k: string) => string, ns?: string, canWarn?: boolean): TFn {
  return (key: string, fallback?: string) => {
    const fullKey = ns && ns.length > 0 ? `${ns}.${key}` : key;
    const out = raw(fullKey);

    if (out === fullKey) {
      if (fallback) return fallback;

      // only warn when translations finished loading
      if (canWarn) {
        console.warn(`[UiStrings] Missing key: '${fullKey}'`);
      }
      return fullKey;
    }

    return out;
  };
}

export function useT(defaultNamespace?: string) {
  const { lang } = useLanguage();

  // Load the correct language based on provider
  const { t: raw, loading, error, translations } = useUiI18n(lang);

  // Only warn after we actually have keys
  const canWarn = !loading && Object.keys(translations || {}).length > 0;

  const t: TFn = useMemo(
    () => buildScopedT(raw, defaultNamespace, canWarn),
    [raw, defaultNamespace, canWarn]
  );

  // Common namespace helper (shared keys like close/cancel/etc)
  const tCommon: TFn = useMemo(() => buildScopedT(raw, "common", canWarn), [raw, canWarn]);

  // Raw (no namespace)
  const tRaw: TFn = useMemo(() => buildScopedT(raw, undefined, canWarn), [raw, canWarn]);

  return {
    t,
    tCommon,
    tRaw,
    loading,
    error: error || "",
    lang,
    uiLang: lang, // ✅ backward compatible alias
    translationsCount: Object.keys(translations || {}).length,
  };
}
