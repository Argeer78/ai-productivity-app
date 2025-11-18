// lib/translateLanguages.ts

export type Region =
  | "Popular"
  | "Europe"
  | "Asia"
  | "Middle East"
  | "Africa"
  | "Americas"
  | "Oceania";

export type Language = {
  code: string;
  label: string;
  flag: string;
  region: Region;
  popular?: boolean;
};

export const LS_PREF_LANG = "aihub_pref_lang";
export const LS_LAST_PATH = "aihub_last_path";
export const LS_AUTO_MODE = "aihub_auto_translate";

export const LANGUAGES: Language[] = [
  // ----- Popular -----
  { code: "en", label: "English", flag: "🇺🇸", region: "Popular", popular: true },
  { code: "es", label: "Spanish", flag: "🇪🇸", region: "Popular", popular: true },
  { code: "fr", label: "French", flag: "🇫🇷", region: "Popular", popular: true },
  { code: "de", label: "German", flag: "🇩🇪", region: "Popular", popular: true },
  { code: "pt", label: "Portuguese", flag: "🇵🇹", region: "Popular", popular: true },
  { code: "ru", label: "Russian", flag: "🇷🇺", region: "Popular", popular: true },
  { code: "it", label: "Italian", flag: "🇮🇹", region: "Popular", popular: true },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Popular", popular: true },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Popular", popular: true },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Popular", popular: true },
  { code: "ar", label: "Arabic", flag: "🇸🇦", region: "Popular", popular: true },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Popular", popular: true },

  // ===== Europe =====
  { code: "en", label: "English (UK)", flag: "🇬🇧", region: "Europe" },
  { code: "en", label: "English (Ireland)", flag: "🇮🇪", region: "Europe" },
  { code: "de", label: "German (Germany)", flag: "🇩🇪", region: "Europe" },
  { code: "de", label: "German (Austria)", flag: "🇦🇹", region: "Europe" },
  { code: "de", label: "German (Switzerland)", flag: "🇨🇭", region: "Europe" },
  { code: "fr", label: "French (France)", flag: "🇫🇷", region: "Europe" },
  { code: "fr", label: "French (Belgium)", flag: "🇧🇪", region: "Europe" },
  { code: "fr", label: "French (Luxembourg)", flag: "🇱🇺", region: "Europe" },
  { code: "fr", label: "French (Switzerland)", flag: "🇨🇭", region: "Europe" },
  { code: "fr", label: "French (Monaco)", flag: "🇲🇨", region: "Europe" },
  { code: "es", label: "Spanish (Spain)", flag: "🇪🇸", region: "Europe" },
  { code: "pt", label: "Portuguese (Portugal)", flag: "🇵🇹", region: "Europe" },
  { code: "it", label: "Italian (Italy)", flag: "🇮🇹", region: "Europe" },
  { code: "it", label: "Italian (San Marino)", flag: "🇸🇲", region: "Europe" },
  { code: "it", label: "Italian (Vatican City)", flag: "🇻🇦", region: "Europe" },
  { code: "nl", label: "Dutch (Netherlands)", flag: "🇳🇱", region: "Europe" },
  { code: "nl", label: "Dutch (Belgium)", flag: "🇧🇪", region: "Europe" },
  { code: "da", label: "Danish", flag: "🇩🇰", region: "Europe" },
  { code: "sv", label: "Swedish", flag: "🇸🇪", region: "Europe" },
  { code: "nb", label: "Norwegian (Bokmål)", flag: "🇳🇴", region: "Europe" },
  { code: "fi", label: "Finnish", flag: "🇫🇮", region: "Europe" },
  { code: "is", label: "Icelandic", flag: "🇮🇸", region: "Europe" },
  { code: "et", label: "Estonian", flag: "🇪🇪", region: "Europe" },
  { code: "lv", label: "Latvian", flag: "🇱🇻", region: "Europe" },
  { code: "lt", label: "Lithuanian", flag: "🇱🇹", region: "Europe" },
  { code: "pl", label: "Polish", flag: "🇵🇱", region: "Europe" },
  { code: "cs", label: "Czech", flag: "🇨🇿", region: "Europe" },
  { code: "sk", label: "Slovak", flag: "🇸🇰", region: "Europe" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺", region: "Europe" },
  { code: "ro", label: "Romanian", flag: "🇷🇴", region: "Europe" },
  { code: "bg", label: "Bulgarian", flag: "🇧🇬", region: "Europe" },
  { code: "el", label: "Greek", flag: "🇬🇷", region: "Europe" },
  { code: "hr", label: "Croatian", flag: "🇭🇷", region: "Europe" },
  { code: "sl", label: "Slovenian", flag: "🇸🇮", region: "Europe" },
  { code: "sr", label: "Serbian", flag: "🇷🇸", region: "Europe" },
  { code: "bs", label: "Bosnian", flag: "🇧🇦", region: "Europe" },
  { code: "mk", label: "Macedonian", flag: "🇲🇰", region: "Europe" },
  { code: "sq", label: "Albanian", flag: "🇦🇱", region: "Europe" },
  { code: "me", label: "Montenegrin", flag: "🇲🇪", region: "Europe" },
  { code: "ru", label: "Russian (Europe)", flag: "🇷🇺", region: "Europe" },
  { code: "uk", label: "Ukrainian", flag: "🇺🇦", region: "Europe" },
  { code: "be", label: "Belarusian", flag: "🇧🇾", region: "Europe" },
  { code: "ro", label: "Romanian (Moldova)", flag: "🇲🇩", region: "Europe" },
  { code: "ka", label: "Georgian", flag: "🇬🇪", region: "Europe" },
  { code: "hy", label: "Armenian", flag: "🇦🇲", region: "Europe" },
  { code: "tr", label: "Turkish (Europe)", flag: "🇹🇷", region: "Europe" },

  // ===== Asia =====
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Asia" },
  { code: "zh-TW", label: "Chinese (Traditional)", flag: "🇹🇼", region: "Asia" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Asia" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Asia" },
  { code: "bn", label: "Bengali", flag: "🇧🇩", region: "Asia" },
  { code: "ur", label: "Urdu", flag: "🇵🇰", region: "Asia" },
  { code: "ta", label: "Tamil", flag: "🇮🇳", region: "Asia" },
  { code: "te", label: "Telugu", flag: "🇮🇳", region: "Asia" },
  { code: "ml", label: "Malayalam", flag: "🇮🇳", region: "Asia" },
  { code: "th", label: "Thai", flag: "🇹🇭", region: "Asia" },
  { code: "vi", label: "Vietnamese", flag: "🇻🇳", region: "Asia" },
  { code: "id", label: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "ms", label: "Malay", flag: "🇲🇾", region: "Asia" },
  { code: "km", label: "Khmer", flag: "🇰🇭", region: "Asia" },
  { code: "lo", label: "Lao", flag: "🇱🇦", region: "Asia" },
  { code: "my", label: "Burmese", flag: "🇲🇲", region: "Asia" },
  { code: "si", label: "Sinhala", flag: "🇱🇰", region: "Asia" },
  { code: "ne", label: "Nepali", flag: "🇳🇵", region: "Asia" },
  { code: "fa", label: "Persian (Farsi)", flag: "🇮🇷", region: "Asia" },

  // ===== Middle East =====
  { code: "ar", label: "Arabic (Standard)", flag: "🇺🇳", region: "Middle East" },
  { code: "he", label: "Hebrew", flag: "🇮🇱", region: "Middle East" },
  { code: "tr", label: "Turkish", flag: "🇹🇷", region: "Middle East" },
  { code: "ku", label: "Kurdish", flag: "🇹🇷", region: "Middle East" },
  { code: "fa", label: "Persian (Iran)", flag: "🇮🇷", region: "Middle East" },

  // ===== Africa =====
  { code: "sw", label: "Swahili", flag: "🇰🇪", region: "Africa" },
  { code: "am", label: "Amharic", flag: "🇪🇹", region: "Africa" },
  { code: "zu", label: "Zulu", flag: "🇿🇦", region: "Africa" },
  { code: "xh", label: "Xhosa", flag: "🇿🇦", region: "Africa" },
  { code: "st", label: "Sesotho", flag: "🇱🇸", region: "Africa" },
  { code: "af", label: "Afrikaans", flag: "🇿🇦", region: "Africa" },
  { code: "yo", label: "Yoruba", flag: "🇳🇬", region: "Africa" },
  { code: "ig", label: "Igbo", flag: "🇳🇬", region: "Africa" },
  { code: "ha", label: "Hausa", flag: "🇳🇬", region: "Africa" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼", region: "Africa" },
  { code: "so", label: "Somali", flag: "🇸🇴", region: "Africa" },
  { code: "fr", label: "French (Africa)", flag: "🇨🇩", region: "Africa" },
  { code: "ar", label: "Arabic (North Africa)", flag: "🇲🇦", region: "Africa" },
  { code: "pt", label: "Portuguese (Mozambique)", flag: "🇲🇿", region: "Africa" },

  // ===== Americas =====
  { code: "en", label: "English (USA)", flag: "🇺🇸", region: "Americas" },
  { code: "en", label: "English (Canada)", flag: "🇨🇦", region: "Americas" },
  { code: "fr", label: "French (Canada)", flag: "🇨🇦", region: "Americas" },
  { code: "es", label: "Spanish (Mexico)", flag: "🇲🇽", region: "Americas" },
  { code: "es", label: "Spanish (Latin America)", flag: "🌎", region: "Americas" },
  { code: "pt-BR", label: "Portuguese (Brazil)", flag: "🇧🇷", region: "Americas" },

  // ===== Oceania =====
  { code: "en", label: "English (Australia)", flag: "🇦🇺", region: "Oceania" },
  { code: "en", label: "English (New Zealand)", flag: "🇳🇿", region: "Oceania" },
];

export const REGION_ORDER: Exclude<Region, "Popular">[] = [
  "Europe",
  "Asia",
  "Middle East",
  "Africa",
  "Americas",
  "Oceania",
];
