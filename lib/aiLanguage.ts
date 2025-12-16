// lib/aiLanguage.ts

/**
 * Normalize language codes coming from the DB / browser
 * Examples:
 *  - el-GR → el
 *  - en-US → en
 */
export function normalizeLang(code?: string | null): string {
  if (!code) return "en";
  return code.toLowerCase().split("-")[0];
}

/**
 * Human-readable language name for the AI model
 */
export function languageName(code: string): string {
  switch (code) {
    case "en": return "English";
    case "el": return "Greek";
    case "fr": return "French";
    case "de": return "German";
    case "es": return "Spanish";
    case "it": return "Italian";
    case "pt": return "Portuguese";
    case "nl": return "Dutch";
    case "pl": return "Polish";
    case "tr": return "Turkish";
    case "ro": return "Romanian";
    case "hu": return "Hungarian";
    case "cs": return "Czech";
    case "sk": return "Slovak";
    case "bg": return "Bulgarian";
    case "sr": return "Serbian";
    case "hr": return "Croatian";
    case "sl": return "Slovenian";
    case "sv": return "Swedish";
    case "da": return "Danish";
    case "fi": return "Finnish";
    case "no": return "Norwegian";
    case "ru": return "Russian";
    case "uk": return "Ukrainian";
    case "ar": return "Arabic";
    case "he": return "Hebrew";
    case "zh": return "Chinese";
    case "ja": return "Japanese";
    case "ko": return "Korean";
    default:
      return "English";
  }
}

/**
 * Strong instruction used in SYSTEM prompts
 */
export function aiLanguageInstruction(rawCode?: string | null): string {
  const code = normalizeLang(rawCode);
  const name = languageName(code);

  return `
Respond ONLY in ${name}.
Do NOT use any other language.
If the user writes in another language, switch to that language.
`.trim();
}
