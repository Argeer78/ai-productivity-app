// lib/i18n.ts

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
export type TranslationKey = string;

export const DEFAULT_LOCALE: Locale = "en";

export function isRTL(code: string): boolean {
  const base = (code || "en").toLowerCase().split("-")[0];
  return base === "ar" || base === "he";
}

// Keep legacy imports working, but don’t require every locale key
export const MESSAGES: Partial<Record<Locale, Record<string, string>>> = {
  en: {},
} as const;

export function translate(lang: Lang, key: TranslationKey, fallback?: string) {
  const dict = MESSAGES[lang] ?? MESSAGES[DEFAULT_LOCALE] ?? {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key]!;
  return typeof fallback === "string" ? fallback : key;
}
