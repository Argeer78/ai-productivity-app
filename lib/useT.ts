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
  | "common"
  | string;

export function useT(namespace: Namespace) {
  const { dict } = useUiStrings();

  function t(key: string, fallback?: string): string {
    const fullKey = `${namespace}.${key}`;
    const val = dict[fullKey];
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug missing
  }

  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const val = dict[fullKey];
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon };
}
