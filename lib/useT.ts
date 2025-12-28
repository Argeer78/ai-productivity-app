// lib/useT.ts
"use client";

import { useMemo } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useUiI18n } from "@/lib/useUiI18n";

type TFn = (key: string, fallback?: string) => string;

export function useT(defaultNamespace?: string) {
  const { lang } = useLanguage();

  // Load translations for the language currently selected in LanguageProvider
  const { t: raw, loading, error, translations } = useUiI18n(lang);

  /**
   * tCommon:
   * Use for shared/global keys with NO forced namespace.
   * Example: tCommon("common.close", "Close")
   * Example: tCommon("translate.translateWithAI", "Translate with AI")
   */
  const tCommon: TFn = useMemo(() => {
    return (key: string, fallback?: string) => {
      const out = raw(key);

      if (out === key) {
        if (fallback) return fallback;
        console.error(`[UiStrings] Check '${key}': undefined`);
        return key;
      }

      return out;
    };
  }, [raw]);

  /**
   * t:
   * Use for module/page keys. If you pass a namespace (e.g. "notes"),
   * you call t("buttons.saveNote") and it resolves "notes.buttons.saveNote".
   *
   * If no namespace, it behaves like tCommon.
   */
  const t: TFn = useMemo(() => {
    return (key: string, fallback?: string) => {
      const fullKey =
        defaultNamespace && defaultNamespace.length > 0
          ? `${defaultNamespace}.${key}`
          : key;

      const out = raw(fullKey);

      if (out === fullKey) {
        if (fallback) return fallback;
        console.error(`[UiStrings] Check '${fullKey}': undefined`);
        return fullKey;
      }

      return out;
    };
  }, [raw, defaultNamespace]);

  /**
   * tRaw:
   * Sometimes you already have the full key (like "notes.buttons.saveNote")
   * and you want a direct lookup without namespace composition.
   */
  const tRaw: TFn = useMemo(() => {
    return (fullKey: string, fallback?: string) => {
      const out = raw(fullKey);
      if (out === fullKey) return fallback ?? fullKey;
      return out;
    };
  }, [raw]);

  return {
    t,
    tCommon,
    tRaw,
    loading,
    error,
    lang,
    translationsCount: Object.keys(translations || {}).length,
  };
}
