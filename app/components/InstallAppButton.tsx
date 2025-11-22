"use client";

import { useEffect, useState } from "react";

export default function InstallAppButton() {
  // We keep types super loose here so TS never blocks the build
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if app already running as PWA
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);

    // Rough iOS Safari detection
    const ua = window.navigator.userAgent || "";
    const isiOS =
      /iPhone|iPad|iPod/.test(ua) &&
      /Safari/.test(ua) &&
      !/CriOS|FxiOS|EdgiOS/.test(ua);

    setIsIosSafari(isiOS);

    function handleBeforeInstallPrompt(e: Event) {
      // Chrome / Edge on Android + desktop
      e.preventDefault();
      console.log("[PWA] beforeinstallprompt fired");
      setDeferredPrompt(e as any);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // If already installed, hide button completely
  if (isStandalone) return null;

  async function handleClick() {
    // 1) Best case: native prompt available
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log("[PWA] userChoice:", choice);
        setDeferredPrompt(null);
      } catch (err) {
        console.error("[PWA] install error", err);
      }
      return;
    }

    // 2) iOS Safari: show instructions
    if (isIosSafari) {
      alert(
        "To install AI Productivity Hub on iPhone/iPad:\n\n" +
          "1. Tap the Share button in Safari (square with arrow).\n" +
          "2. Choose “Add to Home Screen”.\n" +
          "3. Confirm the name and tap “Add”."
      );
      return;
    }

    // 3) Generic fallback
    alert(
      "To install AI Productivity Hub:\n\n" +
        "Open your browser menu and choose “Install app” or “Add to Home screen”."
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-100"
    >
      Install app
    </button>
  );
}
