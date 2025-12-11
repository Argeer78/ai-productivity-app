// lib/i18n.ts

export type Locale =
  | "en"
  | "de"
  | "es"
  | "fr"
  | "it"
  | "pt"
  | "el"
  | "tr"
  | "ru"
  | "ro"
  | "ar"
  | "he"
  | "zh"
  | "ja"
  | "id"
  | "sr"
  | "bg"
  | "hu"
  | "pl"
  | "cs"
  | "da"
  | "sv"
  | "nb"
  | "nl"
  | "hi"
  | "ko";

export type Lang = Locale;

export const DEFAULT_LOCALE: Locale = "en";

// Extended language list with region/popular flags if you want them
export const SUPPORTED_LANGS: {
  code: Locale;
  label: string;
  flag: string;
  region?: string;
  popular?: boolean;
}[] = [
  // Core / original
  { code: "en", label: "English", flag: "🇺🇸", region: "Core", popular: true },
  { code: "de", label: "Deutsch", flag: "🇩🇪", region: "Europe" },
  { code: "es", label: "Español", flag: "🇪🇸", region: "Europe", popular: true },
  { code: "fr", label: "Français", flag: "🇫🇷", region: "Europe", popular: true },
  { code: "it", label: "Italiano", flag: "🇮🇹", region: "Europe" },
  { code: "pt", label: "Português", flag: "🇵🇹", region: "Europe", popular: true },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷", region: "Europe" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷", region: "Europe" },
  { code: "ru", label: "Русский", flag: "🇷🇺", region: "Europe" },
  { code: "ro", label: "Română", flag: "🇷🇴", region: "Europe" },

  // New ones you listed
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
  { code: "pl", label: "Polski", flag: "🇵🇱", region: "Europe" },
  { code: "cs", label: "Čeština", flag: "🇨🇿", region: "Europe" },
  { code: "da", label: "Dansk", flag: "🇩🇰", region: "Europe" },
  { code: "sv", label: "Svenska", flag: "🇸🇪", region: "Europe" },
  { code: "nb", label: "Norsk (Bokmål)", flag: "🇳🇴", region: "Europe" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱", region: "Europe" },
];

// Simple RTL detector used by RtlDirectionManager
export function isRTL(locale: string): boolean {
  const base = locale.split("-")[0].toLowerCase();
  return base === "ar" || base === "he" || base === "fa" || base === "ur";
}
