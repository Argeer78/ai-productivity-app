"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Check = { name: string; ok: boolean; ms: number; detail?: string };

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: any; ms: number }> {
  const t0 = now();
  try {
    const value = await fn();
    return { value, ms: Math.round(now() - t0) };
  } catch (error) {
    return { error, ms: Math.round(now() - t0) };
  }
}

export default function DiagnosticsOverlay() {
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("debug");
  }, []);

  const [open, setOpen] = useState(enabled);
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setOpen(true);
  }, [enabled]);

  async function run() {
    setRunning(true);
    setCopied(false);

    const out: Check[] = [];

    // 1) basic environment
    out.push({
      name: "Browser online",
      ok: typeof navigator !== "undefined" ? navigator.onLine : true,
      ms: 0,
      detail: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
    });

    // 2) load a next static resource (detect cache/SW issues)
    const staticCheck = await timed(async () => {
      const res = await fetch("/favicon.ico", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.blob();
      return true;
    });
    out.push({
      name: "Fetch /favicon.ico",
      ok: !staticCheck.error,
      ms: staticCheck.ms,
      detail: staticCheck.error ? String(staticCheck.error?.message || staticCheck.error) : "ok",
    });

    // 3) API reachability
    const apiCheck = await timed(async () => {
      const res = await fetch("/api/health", { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
      return text;
    });
    out.push({
      name: "Fetch /api/health",
      ok: !apiCheck.error,
      ms: apiCheck.ms,
      detail: apiCheck.error ? String(apiCheck.error?.message || apiCheck.error) : "ok",
    });

    // 4) Supabase session (should never hang)
    const sbSession = await timed(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session ? "has session" : "no session";
    });
    out.push({
      name: "Supabase getSession()",
      ok: !sbSession.error,
      ms: sbSession.ms,
      detail: sbSession.error ? String(sbSession.error?.message || sbSession.error) : String(sbSession.value),
    });

    // 5) Supabase anonymous request (detect network blocks to supabase)
    const sbPing = await timed(async () => {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error) throw error;
      return true;
    });
    out.push({
      name: "Supabase DB request",
      ok: !sbPing.error,
      ms: sbPing.ms,
      detail: sbPing.error ? String(sbPing.error?.message || sbPing.error) : "ok",
    });

    // 6) service worker status
    let swDetail = "n/a";
    let swOk = true;
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        swDetail = reg ? `registered (${reg.active?.scriptURL || "no active"})` : "not registered";
      } else {
        swDetail = "unsupported";
      }
    } catch (e: any) {
      swOk = false;
      swDetail = String(e?.message || e);
    }
    out.push({ name: "Service worker", ok: swOk, ms: 0, detail: swDetail });

    setChecks(out);
    setRunning(false);
  }

  async function copyReport() {
    const report = {
      time: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "",
      checks,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const text = JSON.stringify(report, null, 2);
      prompt("Copy this report:", text);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[9999] w-[360px] max-w-[92vw] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-3 text-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold">Diagnostics</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
        >
          Close
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-60 text-xs"
        >
          {running ? "Running…" : "Run checks"}
        </button>
        <button
          type="button"
          onClick={copyReport}
          disabled={!checks.length}
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] disabled:opacity-60 text-xs"
        >
          {copied ? "Copied ✅" : "Copy report"}
        </button>
      </div>

      {!checks.length ? (
        <p className="text-[11px] text-[var(--text-muted)]">
          Open any page with <span className="font-mono">?debug=1</span> and run checks.
        </p>
      ) : (
        <div className="space-y-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="text-[11px]">
                <span className={c.ok ? "text-emerald-400" : "text-red-400"}>
                  {c.ok ? "●" : "●"}
                </span>{" "}
                {c.name}
                {c.detail ? <div className="text-[10px] text-[var(--text-muted)]">{c.detail}</div> : null}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] shrink-0">{c.ms ? `${c.ms}ms` : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
