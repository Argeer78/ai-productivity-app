// app/hooks/usePwaInstall.ts
"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  // Detect if already installed / standalone
  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);

    const ua = window.navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    setIsIosSafari(isIOS && isSafari);
  }, []);

  // Capture beforeinstallprompt for supported browsers
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      const bipEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bipEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // Clear it – browsers usually only let you use it once
      setDeferredPrompt(null);
      return choice.outcome === "accepted";
    } catch (err) {
      console.error("[PWA] install failed", err);
      setDeferredPrompt(null);
      return false;
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !isStandalone && !isIosSafari,
    isStandalone,
    isIosSafari,
    install,
  };
}
