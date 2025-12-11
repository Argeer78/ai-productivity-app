// lib/useT.ts
"use client";

import { useUiStrings } from "@/app/components/UiStringsProvider";

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

export function useT(namespace?: Namespace) {
  const { lang, translations } = useUiStrings();

  function resolveKey(key: string): string {
    if (!namespace) return key;

    // If it already looks namespaced, don't double-prefix
    if (key.startsWith(namespace + ".") || key.includes(".")) {
      return key;
    }

    return `${namespace}.${key}`;
  }

  function t(key: string, fallback?: string): string {
    const fullKey = resolveKey(key);
    const value = translations[fullKey];

    if (typeof value === "string") return value;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug missing key
  }

  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const value = translations[fullKey];

    if (typeof value === "string") return value;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon, lang };
}
