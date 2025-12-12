"use client";

import { useUiStrings } from "@/app/components/UiStringsProvider";

type Namespace = string;

export function useT(namespace: Namespace) {
  const { dict } = useUiStrings();

  function t(key: string, fallback?: string): string {
    // your existing pages use: useT("notes") + t("create.heading")
    const fullKey = `${namespace}.${key}`;
    const v = dict[fullKey];
    if (typeof v === "string" && v.length) return v;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  function tCommon(key: string, fallback?: string): string {
    const fullKey = `common.${key}`;
    const v = dict[fullKey];
    if (typeof v === "string" && v.length) return v;
    if (typeof fallback === "string") return fallback;
    return fullKey;
  }

  return { t, tCommon };
}
