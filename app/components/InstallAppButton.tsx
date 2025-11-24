"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppButton() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  // ✅ This makes server + first client render identical (mounted = false)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    // Detect if app already running as PWA
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);

    const ua = window.navigator.userAgent || "";
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) &&
      /Safari/.test(ua) &&
      !/CriOS|FxiOS|EdgiOS/.test(ua);

    setIsIosSafari(isiOS);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [mounted]);

  // ❗ Important: server + first client render both return null here
  if (!mounted || isStandalone) return null;

  async function handleClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.error("[PWA] beforeinstallprompt error", err);
      }
    }

    if (isIosSafari) {
      alert(
        "To install AI Productivity Hub on iOS:\n\n" +
          "1. Tap the Share icon in Safari.\n" +
          '2. Choose "Add to Home Screen".'
      );
      return;
    }

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
