// lib/i18n.ts
// IMPORTANT: This file must be client-safe (no supabaseAdmin, no server-only imports)

export const SUPPORTED_LANGS = [
  { code: "en", label: "English", flag: "🇺🇸", region: "Global", popular: true },
  { code: "de", label: "German", flag: "🇩🇪", region: "Europe" },
  { code: "es", label: "Spanish", flag: "🇪🇸", region: "Europe/LatAm" },
  { code: "fr", label: "French", flag: "🇫🇷", region: "Europe" },
  { code: "it", label: "Italian", flag: "🇮🇹", region: "Europe" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹", region: "Europe", popular: true },
  { code: "el", label: "Greek", flag: "🇬🇷", region: "Europe" },
  { code: "tr", label: "Turkish", flag: "🇹🇷", region: "Europe/Asia" },
  { code: "ru", label: "Russian", flag: "🇷🇺", region: "Europe/Asia" },
  { code: "ro", label: "Romanian", flag: "🇷🇴", region: "Europe" },
  { code: "ar", label: "Arabic (Standard)", flag: "🇺🇳", region: "Middle East" },
  { code: "he", label: "Hebrew", flag: "🇮🇱", region: "Middle East" },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Asia" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "id", label: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Popular", popular: true },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Popular", popular: true },
  { code: "sr", label: "Serbian", flag: "🇷🇸", region: "Europe" },
  { code: "bg", label: "Bulgarian", flag: "🇧🇬", region: "Europe" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺", region: "Europe" },
  { code: "pl", label: "Polish", flag: "🇵🇱", region: "Europe" },
  { code: "cs", label: "Czech", flag: "🇨🇿", region: "Europe" },
  { code: "da", label: "Danish", flag: "🇩🇰", region: "Europe" },
  { code: "sv", label: "Swedish", flag: "🇸🇪", region: "Europe" },
  { code: "nb", label: "Norwegian (Bokmål)", flag: "🇳🇴", region: "Europe" },
  { code: "nl", label: "Dutch (Netherlands)", flag: "🇳🇱", region: "Europe" },
] as const;

export type Locale = (typeof SUPPORTED_LANGS)[number]["code"];
export type Lang = Locale;

export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLang(code?: string | null): Locale {
  const base = String(code || DEFAULT_LOCALE).toLowerCase().split("-")[0];
  const exists = SUPPORTED_LANGS.some((l) => l.code === base);
  return (exists ? base : DEFAULT_LOCALE) as Locale;
}

export function isRTL(code: string): boolean {
  const base = String(code || "en").toLowerCase().split("-")[0];
  return base === "ar" || base === "he";
}

// This is intentionally runtime-loaded from your API (/api/ui-translations/[lang])
// Keep an in-memory dictionary that your providers can fill.
const DICTS: Partial<Record<Locale, Record<string, string>>> = {};

export function setDictionary(lang: Locale, dict: Record<string, string>) {
  DICTS[lang] = dict;
}

export function getDictionary(lang: Locale): Record<string, string> {
  return DICTS[lang] || DICTS[DEFAULT_LOCALE] || {};
}

export function translate(lang: Locale, key: string, fallback?: string) {
  const dict = getDictionary(lang);
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  return typeof fallback === "string" ? fallback : key;
}
