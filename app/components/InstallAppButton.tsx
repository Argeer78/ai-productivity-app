"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppButton() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  // Ensure server + first client render match
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari standalone
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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [mounted]);

  // Don’t show the button until after mount, or if already installed
  if (!mounted || isStandalone) return null;

  async function handleClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log("[PWA] userChoice", choice.outcome, choice.platform);
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

  const label = deferredPrompt ? "Install app" : "How to install";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-soft)] text-[11px] text-[var(--text-main)]"
    >
      {label}
    </button>
  );
}
