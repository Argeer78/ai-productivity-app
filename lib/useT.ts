// lib/useT.ts
"use client";

import { useUiStrings } from "@/app/components/UiStringsProvider";
import { useUiLanguage } from "@/app/components/UiLanguageProvider";

type Namespace = string;

export function useT(namespace?: Namespace) {
  const { dict } = useUiStrings();
  const { uiLang } = useUiLanguage(); // ✅ keep for reactivity

  function get(fullKey: string, fallback?: string): string {
    const val = dict[fullKey];
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug fallback
  }

  /**
   * Rules:
   * - If key starts with "common.", never namespace it
   * - If key already starts with `${namespace}.`, use as-is
   * - Otherwise prefix with namespace
   */
  function t(key: string, fallback?: string): string {
    const ns = namespace ? `${namespace}.` : "";

    if (key.startsWith("common.")) {
      return get(key, fallback);
    }

    if (ns && key.startsWith(ns)) {
      return get(key, fallback);
    }

    if (!ns) {
      return get(key, fallback);
    }

    return get(`${ns}${key}`, fallback);
  }

  function tCommon(key: string, fallback?: string): string {
    return get(`common.${key}`, fallback);
  }

  return {
    t,
    tCommon,
    uiLang, // optional but useful for debugging / conditional UI
  };
}
