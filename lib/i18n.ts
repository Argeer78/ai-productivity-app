// lib/i18n.ts

// ---- Supported languages list ----
export const SUPPORTED_LANGS = [
  // Core
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

  // Middle East / RTL
  { code: "ar", label: "Arabic (Standard)", flag: "🇺🇳", region: "Middle East" },
  { code: "he", label: "Hebrew", flag: "🇮🇱", region: "Middle East" },

  // Asia
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Asia" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "id", label: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Popular", popular: true },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Popular", popular: true },

  // Extra Europe languages
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

// In the new system we use arbitrary string keys like "notes.create.heading"
export type TranslationKey = string;

// ---- Default locale ----
export const DEFAULT_LOCALE: Locale = "en";

// ---- Legacy static messages (now just a tiny fallback) ----
// We keep this so imports like `MESSAGES` continue to work,
// but the *real* strings come from Supabase via /api/ui-translations + useT.
export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    // You can optionally put a few emergency fallbacks here, e.g.:
    // "nav.dashboard": "Dashboard",
    // "nav.notes": "Notes",
  },
  // Other languages will be provided dynamically; no need to fill them here.
} as const;

// ---- Utility: check if language is RTL ----
export function isRTL(code: Locale): boolean {
  return code === "ar" || code === "he";
}

// ---- Legacy translate() helper used by LanguageProvider.t ----
// This is now a *simple* lookup into MESSAGES with fallback.
export function translate(
  lang: Lang,
  key: TranslationKey,
  fallback?: string
): string {
  const dict =
    (MESSAGES[lang] as Record<string, string> | undefined) ||
    (MESSAGES[DEFAULT_LOCALE] as Record<string, string> | undefined) ||
    {};

  if (Object.prototype.hasOwnProperty.call(dict, key)) {
    return dict[key];
  }

  if (typeof fallback === "string") return fallback;
  return key; // good for debugging missing keys
}
