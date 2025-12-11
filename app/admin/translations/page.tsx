// app/admin/translations/page.tsx
"use client";

import { useState } from "react";

export default function TranslationsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ui-translations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageCode: "el" }), // Greek example
      });
      const data = await res.json();
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
      <p className="text-xs text-slate-400 mb-3">
        Syncs missing UI strings from English into Greek (el) and stores them in
        Supabase.
      </p>
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs disabled:opacity-60"
      >
        {loading ? "Translating…" : "Sync Greek UI translations"}
      </button>

      {result && (
        <pre className="mt-3 text-[11px] whitespace-pre-wrap bg-black/20 p-2 rounded-xl">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
