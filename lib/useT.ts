// lib/useT.ts
"use client";

import { useUiStrings } from "@/app/components/UiStringsProvider";

type Namespace = string;

export function useT(namespace?: Namespace) {
  const { dict } = useUiStrings();

  function get(fullKey: string, fallback?: string) {
    const val = dict[fullKey];
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof fallback === "string") return fallback;
    return fullKey; // debug
  }

  /**
   * Rules:
   * - If key is already absolute (starts with `${namespace}.`, `common.`, or any ns prefix you want),
   *   use it as-is.
   * - Otherwise, ALWAYS prefix with namespace (even if it contains dots).
   */
  function t(key: string, fallback?: string): string {
    const ns = namespace ? `${namespace}.` : "";

    // absolute keys you don't want namespaced
    if (key.startsWith("common.")) return get(key, fallback);

    // if caller already passed tasks.xxx explicitly
    if (ns && key.startsWith(ns)) return get(key, fallback);

    // if no namespace provided, just use key as-is
    if (!ns) return get(key, fallback);

    // ✅ namespace everything else (including dotted keys like "date.month.jan")
    return get(`${ns}${key}`, fallback);
  }

  function tCommon(key: string, fallback?: string): string {
    return get(`common.${key}`, fallback);
  }

  return { t, tCommon };
}
