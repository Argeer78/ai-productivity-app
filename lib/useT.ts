// lib/useT.ts
"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

type Namespace =
  | "home"
  | "dashboard"
  | "notes"
  | "tasks"
  | "templates"
  | "dailySuccess"
  | "weeklyReports"
  | "travel"
  | "settings"
  | "aiChat"
  | "translate"
  | "tools"
  | string;

// Simple client-side cache: lang -> translations map
const uiCache: Record<string, Record<string, string>> = {};
const uiCacheLoading: Record<string, boolean> = {};

/**
 * Hook to translate namespaced keys using data from:
 *   GET /api/ui-translations/[lang]
 *
 * Keys in Supabase are flat, e.g.:
 *   "notes.create.heading"
 *   "tasks.list.title"
 *
 * Usage:
 *   const { t } = useT("notes");
 *   t("create.heading", "Create a new note");
 */
export function useT(namespace: Namespace) {
  const languageCtx = useLanguage() as any;

  const ctxLang: string | undefined =
    languageCtx?.lang ||
    languageCtx?.code ||
    languageCtx?.languageCode ||
    languageCtx?.language;

  const lang: Locale = (ctxLang || DEFAULT_LOCALE) as Locale;

  const [dict, setDict] = useState<Record<string, string>>(() => {
    return uiCache[lang] || {};
  });

  // Load translations for the current language (if not cached yet)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Already cached → just use it
      if (uiCache[lang]) {
        if (!cancelled) setDict(uiCache[lang]);
        return;
      }

      // Prevent concurrent fetches per lang
      if (uiCacheLoading[lang]) return;
      uiCacheLoading[lang] = true;

      try {
        const res = await fetch(`/api/ui-translations/${lang}`);
        if (!res.ok) {
          console.error(
            "[useT] Failed to fetch ui-translations for",
            lang,
            res.status
          );
          uiCacheLoading[lang] = false;
          return;
        }

        const json = await res.json();
        const translations =
          (json && json.translations) || ({} as Record<string, string>);

        uiCache[lang] = translations;
        uiCacheLoading[lang] = false;

        if (!cancelled) {
          setDict(translations);
        }
      } catch (err) {
        console.error("[useT] Error fetching ui-translations:", err);
        uiCacheLoading[lang] = false;
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // namespaced translation: "namespace.key"
  function t(key: string, fallback?: string): string {
    const fullKey = `${namespace}.${key}`;
    const value = dict[fullKey];

    if (typeof value === "string" && value.length > 0) return value;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug missing key
  }

  // common translation: "common.key"
  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const value = dict[fullKey];

    if (typeof value === "string" && value.length > 0) return value;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon, lang };
}
