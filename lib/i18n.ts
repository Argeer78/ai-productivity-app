// lib/i18n.ts

// 1) Language codes you want to support
export type Lang =
  | "en"
  | "de"
  | "es"
  | "fr"
  | "it"
  | "pt"
  | "el"
  | "tr"
  | "ru"
  | "ro";

// 2) Languages for dropdowns / selectors
export const SUPPORTED_LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
];

// 3) Keys for translations (keep it loose for now)
export type TranslationKey = string;

// 4) Small translation dictionary – currently mostly English.
const translations: Partial<Record<Lang, Record<TranslationKey, string>>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.notes": "Notes",
    "nav.tasks": "Tasks",
    "nav.planner": "Planner",
    "nav.templates": "Templates",
    "nav.dailySuccess": "Daily Success",
    "nav.weeklyReports": "Weekly Reports",
    "nav.travel": "Travel Planner",
    "nav.myTrips": "My Trips",
    "nav.feedback": "Feedback",
    "nav.settings": "Settings",
    "nav.changelog": "What’s new",
    "nav.admin": "Admin",
  },

  // other languages to fill later
  de: {},
  es: {},
  fr: {},
  it: {},
  pt: {},
  el: {},
  tr: {},
  ru: {},
  ro: {},
};

// 5) Translate helper
export function translate(
  lang: Lang,
  key: TranslationKey,
  fallback?: string
): string {
  const langDict = translations[lang];
  if (langDict && langDict[key]) {
    return langDict[key]!;
  }
  // fallback so UI never breaks
  return fallback ?? key;
}
