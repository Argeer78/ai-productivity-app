export const MAX_VOICE_FILE_BYTES = 10 * 1024 * 1024;

const VOICE_MODES = new Set(["review", "autosave", "psych", "travel"]);
const AUDIO_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
]);

export type VoiceMode = "review" | "autosave" | "psych" | "travel";

export function parseVoiceMode(value: FormDataEntryValue | null): VoiceMode | null {
  return typeof value === "string" && VOICE_MODES.has(value) ? value as VoiceMode : null;
}

export function isAllowedVoiceFile(file: File): boolean {
  return file.size >= 2_000 && file.size <= MAX_VOICE_FILE_BYTES && AUDIO_TYPES.has(file.type);
}

export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}