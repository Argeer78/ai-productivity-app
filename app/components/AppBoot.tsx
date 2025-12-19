"use client";

import { useEffect, useState } from "react";
import { isFacebookInAppBrowser } from "@/lib/isInAppBrowser";

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
      req.onupgradeneeded = () => {};
    });
    try {
      indexedDB.deleteDatabase("__idb_test__");
    } catch {}
    return "ok";
  } catch (e: any) {
    const name = e?.name || "";
    if (name === "SecurityError") return "blocked";
    return "error";
  }
}

export default function AppBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  // Debug UI (only when ?debug=1) — must be decided AFTER mount to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  const [debugOn, setDebugOn] = useState(false);

  const [runningChecks, setRunningChecks] = useState(false);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [copyMsg, setCopyMsg] = useState<string>("");

  useEffect(() => {
    setMounted(true);

    try {
      const sp = new URLSearchParams(window.location.search);
      setDebugOn(sp.get("debug") === "1");
    } catch {
      setDebugOn(false);
    }
  }, []);

  async function runChecks() {
    if (typeof window === "undefined") return;
    setRunningChecks(true);
    setCopyMsg("");

    const started = Date.now();

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

    // Service worker checks
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
      // eslint-disable-next-line no-console
      console.log("[debug report]", rep, "totalMs=", Date.now() - started);
    } catch {}
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
      // 🚨 Facebook / Instagram in-app browser = skip SW wait
      if (isFacebookInAppBrowser()) {
        if (!cancelled) setReady(true);
        return;
      }

      // ✅ IMPORTANT: never block forever waiting for SW
      if ("serviceWorker" in navigator) {
        try {
          await withTimeout(navigator.serviceWorker.ready, 2500);
        } catch {
          // ignore — continue loading app anyway
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

        {mounted && debugOn && (
          <div
            style={{
              marginTop: 8,
              width: "min(720px, 100%)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              padding: 12,
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
              Debug mode is ON (<code>?debug=1</code>). If this device is stuck, run checks and send the report.
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

              <button
                type="button"
                onClick={() => setReady(true)}
                style={{
                  background: "transparent",
                  color: "#e5e7eb",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Continue anyway
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
                  maxHeight: 260,
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
      </div>
    );
  }

  return <>{children}</>;
}
