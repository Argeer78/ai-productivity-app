"use client";

import { useUiLanguage } from "@/app/components/UiLanguageProvider";
import type { UiLanguage } from "@/lib/uiLanguage";

export default function LanguagePicker() {
  const { uiLang, setUiLang } = useUiLanguage();

  const options: { value: UiLanguage; label: string }[] = [
    { value: "en", label: "English" },
    { value: "el", label: "Ελληνικά" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--text-muted)]">Language</span>
      <select
        value={uiLang}
        onChange={(e) => setUiLang(e.target.value as UiLanguage)}
        className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
