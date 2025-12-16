// lib/uiLanguage.ts
export type UiLanguage = "en" | "el" | "fr" | "de"; // add more later

const KEY = "aiprod_ui_language";
const EVENT = "aiprod:language";

export function normalizeUiLanguage(input: string | null | undefined): UiLanguage {
  const c = (input || "").toLowerCase();
  if (c.startsWith("el")) return "el";
  if (c.startsWith("fr")) return "fr";
  if (c.startsWith("de")) return "de";
  return "en";
}

export function getBrowserLanguage(): UiLanguage {
  if (typeof window === "undefined") return "en";
  return normalizeUiLanguage(navigator.language);
}

export function getStoredUiLanguage(): UiLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v ? normalizeUiLanguage(v) : null;
  } catch {
    return null;
  }
}

export function setStoredUiLanguage(lang: UiLanguage) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  // optional: update <html lang="">
  try {
    document.documentElement.lang = lang;
  } catch {}
  // broadcast so hooks/components update instantly
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { lang } }));
}

export function onUiLanguageChange(cb: (lang: UiLanguage) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent;
    const lang = normalizeUiLanguage(ce?.detail?.lang);
    cb(lang);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
