// lib/useT.ts
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import type { Locale } from "@/lib/i18n";

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
  | string;

/**
 * Small in-memory cache so we don't refetch the same language over and over.
 */
const uiCache: Record<string, Record<string, string> | null> = {};
const uiCacheLoading: Record<string, boolean> = {};

async function fetchUiTranslations(lang: string): Promise<Record<string, string>> {
  // Already loaded
  if (uiCache[lang]) return uiCache[lang] as Record<string, string>;

  // Avoid duplicate concurrent fetches
  if (uiCacheLoading[lang]) {
    // Poll until it's ready (very small + only in client)
    await new Promise<void>((resolve) => {
      const id = setInterval(() => {
        if (uiCache[lang]) {
          clearInterval(id);
          resolve();
        }
      }, 50);
    });
    return uiCache[lang] as Record<string, string>;
  }

  uiCacheLoading[lang] = true;

  try {
    const res = await fetch(`/api/ui-translations/${lang}`);
    if (!res.ok) throw new Error(`Failed to load UI translations for ${lang}`);
    const json = await res.json();
    const dict = (json?.translations || {}) as Record<string, string>;
    uiCache[lang] = dict;
    return dict;
  } catch (err) {
    console.error("[useT] fetchUiTranslations error", err);
    uiCache[lang] = {};
    return {};
  } finally {
    uiCacheLoading[lang] = false;
  }
}

export function useT(namespace: Namespace) {
  const { lang: ctxLang } = useLanguage();
  const lang = (ctxLang || "en") as Locale;

  const [dict, setDict] = useState<Record<string, string>>(() => {
    return uiCache[lang] || {};
  });

  // Load / refresh translations when language changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchUiTranslations(lang);
      if (!cancelled) {
        setDict(data);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  /**
   * Normal translation. If `key` already looks like "namespace.key",
   * we use it as-is. Otherwise we prefix with the provided namespace.
   *
   * This means BOTH patterns work:
   *   const { t } = useT("notes");
   *   t("title")                 -> looks for "notes.title"
   *   t("notes.title")           -> looks for "notes.title" (no double prefix)
   */
  function t(key: string, fallback?: string): string {
    const fullKey = key.includes(".")
      ? key
      : `${namespace}.${key}`;

    const value = dict[fullKey];

    if (typeof value === "string" && value.length > 0) return value;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug-ish fallback
  }

  /**
   * "common" namespace helper, for shared keys like common.ok / common.cancel
   */
  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const value = dict[fullKey];

    if (typeof value === "string" && value.length > 0) return value;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon, lang };
}
