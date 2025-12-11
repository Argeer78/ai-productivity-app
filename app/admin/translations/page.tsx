// app/admin/translations/page.tsx
"use client";

import { useState } from "react";
import { SUPPORTED_LANGS } from "@/lib/i18n";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export default function TranslationsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [languageCode, setLanguageCode] = useState<string>("el");

  async function handleSync() {
    if (!languageCode) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/ui-translation-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ADMIN_KEY ? { "X-Admin-Key": ADMIN_KEY } : {}),
        },
        body: JSON.stringify({ languageCode }),
      });

      const data = await res.json().catch(() => ({} as any));
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-4 text-sm">
      <h1 className="text-xl font-semibold mb-2">UI Translations Admin</h1>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        Use AI to translate all English UI strings into another language and
        upsert them into the <code>ui_translations</code> table.
      </p>

      <div className="flex flex-col gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--text-main)]">
            Target language
          </label>
          <select
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-2 text-xs"
          >
            {/* Optional grouping by region / popular if you want */}
            {SUPPORTED_LANGS.filter((l) => l.code !== "en").map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label} ({lang.code})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="self-start px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs disabled:opacity-60"
        >
          {loading
            ? `Syncing ${languageCode}…`
            : `Sync UI translations for ${languageCode}`}
        </button>

        {!ADMIN_KEY && (
          <p className="text-[11px] text-amber-400">
            Warning: <code>NEXT_PUBLIC_ADMIN_KEY</code> is not set – the API
            call will be rejected by the server.
          </p>
        )}
      </div>

      {result && (
        <pre className="mt-3 text-[11px] whitespace-pre-wrap bg-black/20 p-2 rounded-xl">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
