// lib/useT.ts
"use client";

import { useLanguage } from "@/app/components/LanguageProvider";
import { MESSAGES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

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

export function useT(namespace: Namespace) {
  const languageCtx = useLanguage() as any;

  const ctxLang: string | undefined =
    languageCtx?.lang ||
    languageCtx?.code ||
    languageCtx?.languageCode ||
    languageCtx?.language;

  const lang: Locale =
    (ctxLang && MESSAGES[ctxLang as Locale] ? (ctxLang as Locale) : DEFAULT_LOCALE);

  const dict = MESSAGES[lang] || {};

  // namespaced translation: "<namespace>.<key>"
  function t(key: string, fallback?: string): string {
    const fullKey = `${namespace}.${key}`;
    const value = dict[fullKey];

    if (typeof value === "string") return value;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug missing key
  }

  // common translation: "common.<key>"
  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const value = dict[fullKey];

    if (typeof value === "string") return value;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon, lang };
}
