// app/components/InstallAppButton.tsx
"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIosStandalone() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const standalone = (window.navigator as any).standalone === true;
  return isIos && standalone;
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|chromium|chrome/.test(ua);
  return isIos && isSafari;
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect already-installed PWA
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(isStandalone);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bip);
      setReady(true);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleClick() {
    // If already installed, do nothing
    if (installed) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log("[PWA] userChoice", choice);
        setDeferredPrompt(null);
      } catch (err) {
        console.error("[PWA] install error", err);
      }
      return;
    }

    // No prompt available: if iOS Safari, show help
    if (isIosSafari()) {
      setShowIosHelp(true);
      return;
    }

    // On other platforms with no prompt: just do nothing
    console.log("[PWA] No install prompt available on this platform.");
  }

  // If already installed, hide the button completely
  if (installed) return null;

  // Show button even if not "ready", so iOS can get the help popup
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] flex-shrink-0"
      >
        Install app
      </button>

      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 max-w-xs text-xs text-slate-100">
            <p className="font-semibold mb-2">Install on iPhone</p>
            <p className="mb-2 text-slate-300">
              1. Tap the <strong>Share</strong> button in Safari.
            </p>
            <p className="mb-2 text-slate-300">
              2. Scroll down and tap{" "}
              <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
            <p className="mb-3 text-slate-300">
              3. Confirm to create the app shortcut.
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[11px]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
