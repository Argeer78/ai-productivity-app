"use client";

import { useEffect, useState } from "react";

type StorageStatus = "ok" | "blocked" | "error";

type CheckReport = {
  ts: string;
  href: string;
  ua: string;
  platform?: string;
  language?: string;
  cookiesEnabled?: boolean;

  serviceWorker: {
    supported: boolean;
    readyResolved: boolean;
    readyError?: string;
    readyMs?: number;

    controller: boolean;
    registrations?: { scope: string; scriptURL?: string }[];
    registrationsError?: string;
  };

  storage: {
    localStorage: StorageStatus;
    sessionStorage: StorageStatus;
    indexedDB: StorageStatus;
  };

  network: {
    online: boolean;
    effectiveType?: string;
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number) {
  let timeoutId: any;
  const timeout = new Promise<never>((_, rej) => {
    timeoutId = setTimeout(() => rej(new Error(`Timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeStorageTest(kind: "localStorage" | "sessionStorage"): StorageStatus {
  try {
    const s = window[kind];
    const k = "__test__" + Math.random().toString(16).slice(2);
    s.setItem(k, "1");
    s.removeItem(k);
    return "ok";
  } catch (e: any) {
    const name = e?.name || "";
    if (name === "SecurityError") return "blocked";
    return "error";
  }
}

async function safeIndexedDBTest(): Promise<StorageStatus> {
  try {
    if (!("indexedDB" in window)) return "blocked";
    const req = indexedDB.open("__idb_test__", 1);
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => { };
    });
    try {
      indexedDB.deleteDatabase("__idb_test__");
    } catch { }
    return "ok";
  } catch (e: any) {
    const name = e?.name || "";
    if (name === "SecurityError") return "blocked";
    return "error";
  }
}

export default function AppBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  // Debug UI state
  const [mounted, setMounted] = useState(false);
  const [debugOn, setDebugOn] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const [runningChecks, setRunningChecks] = useState(false);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [copyMsg, setCopyMsg] = useState<string>("");

  useEffect(() => {
    setMounted(true);

    // Read query params ONLY on client
    try {
      const sp = new URLSearchParams(window.location.search);
      const on = sp.get("debug") === "1";
      setDebugOn(on);

      // If debug=1 and we are stuck on loading, opening panel helps
      if (on) setDebugOpen(true);
    } catch {
      setDebugOn(false);
    }
  }, []);

  async function runChecks() {
    if (typeof window === "undefined") return;
    setRunningChecks(true);
    setCopyMsg("");

    const rep: CheckReport = {
      ts: new Date().toISOString(),
      href: window.location.href,
      ua: navigator.userAgent,
      platform: (navigator as any).platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,

      serviceWorker: {
        supported: "serviceWorker" in navigator,
        readyResolved: false,
        controller: false,
      },

      storage: {
        localStorage: "error",
        sessionStorage: "error",
        indexedDB: "error",
      },

      network: {
        online: navigator.onLine,
        effectiveType: (navigator as any)?.connection?.effectiveType,
      },
    };

    // Storage checks
    rep.storage.localStorage = safeStorageTest("localStorage");
    rep.storage.sessionStorage = safeStorageTest("sessionStorage");
    rep.storage.indexedDB = await safeIndexedDBTest();

    // SW checks
    if ("serviceWorker" in navigator) {
      const swStart = Date.now();
      try {
        await withTimeout(navigator.serviceWorker.ready, 2500);
        rep.serviceWorker.readyResolved = true;
      } catch (e: any) {
        rep.serviceWorker.readyResolved = false;
        rep.serviceWorker.readyError = e?.message || String(e);
      } finally {
        rep.serviceWorker.readyMs = Date.now() - swStart;
      }

      rep.serviceWorker.controller = !!navigator.serviceWorker.controller;

      try {
        const regs = await withTimeout(navigator.serviceWorker.getRegistrations(), 2500);
        rep.serviceWorker.registrations = regs.map((r) => ({
          scope: r.scope,
          scriptURL:
            (r.active as any)?.scriptURL ||
            (r.installing as any)?.scriptURL ||
            (r.waiting as any)?.scriptURL,
        }));
      } catch (e: any) {
        rep.serviceWorker.registrationsError = e?.message || String(e);
      }
    }

    setReport(rep);
    setRunningChecks(false);

    try {

      console.log("[debug report]", rep);
    } catch { }
  }

  async function copyReport() {
    if (!report) return;
    try {
      const text = JSON.stringify(report, null, 2);
      await navigator.clipboard.writeText(text);
      setCopyMsg("✅ Copied. Paste it here.");
    } catch {
      setCopyMsg("❌ Copy failed. Select the text manually.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Never block forever on SW
      if ("serviceWorker" in navigator) {
        try {
          await withTimeout(navigator.serviceWorker.ready, 2500);
        } catch {
          // ignore
        }
      }

      await sleep(0);

      if (!cancelled) setReady(true);
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const DebugPanel = mounted && debugOn ? (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setDebugOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 999999,
          background: "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 12,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {debugOpen ? "Close debug" : "Debug"}
      </button>

      {/* Panel */}
      {debugOpen && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 58,
            zIndex: 999999,
            width: "min(720px, calc(100vw - 24px))",
            maxHeight: "70vh",
            overflow: "auto",
            background: "rgba(2, 6, 23, 0.96)",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.95, marginBottom: 8 }}>
            Debug mode is ON (<code>?debug=1</code>). Run checks and copy the report.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={runChecks}
              disabled={runningChecks}
              style={{
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                opacity: runningChecks ? 0.6 : 1,
              }}
            >
              {runningChecks ? "Running checks…" : "Run checks"}
            </button>

            {report && (
              <button
                type="button"
                onClick={copyReport}
                style={{
                  background: "transparent",
                  color: "#e5e7eb",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Copy report
              </button>
            )}
          </div>

          {copyMsg ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>{copyMsg}</div>
          ) : null}

          {report ? (
            <pre
              style={{
                marginTop: 10,
                fontSize: 11,
                lineHeight: 1.35,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 320,
                overflow: "auto",
                padding: 10,
                borderRadius: 10,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {JSON.stringify(report, null, 2)}
            </pre>
          ) : null}
        </div>
      )}
    </>
  ) : null;

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 16,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        <div>Loading…</div>
        {/* Debug UI also available during loading */}
        {DebugPanel}
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Debug UI available after load too */}
      {DebugPanel}
    </>
  );
}
