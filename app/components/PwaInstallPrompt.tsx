// app/components/PwaInstallPrompt.tsx
"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/useT";

// Type definition for the "beforeinstallprompt" event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function PwaInstallPrompt() {
  const { t } = useT("pwaPrompt");

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Only show if not already installed
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleBeforeInstallPrompt(e: Event) {
      // Chrome & some browsers fire this
      e.preventDefault();
      const bipEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(bipEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // If already installed, don't show anything
  if (isStandalone) return null;
  if (!visible || !deferredPrompt) return null;

  async function handleInstallClick() {
    if (!deferredPrompt) return; // extra runtime guard

    try {
      setInstalling(true);

      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      // Hide prompt for this session regardless of outcome
      console.log("[PWA] userChoice:", choice);
      setVisible(false);
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] install error", err);
      setVisible(false);
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9998] max-w-xs w-[95%]">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-body)_95%,transparent)] px-3 py-2.5 shadow-xl text-xs text-[var(--text-main)] flex items-start gap-3">
        <div className="mt-0.5">📱</div>
        <div className="flex-1">
          <p className="font-semibold mb-0.5">
            {t("title", "Install AI Productivity Hub as an app")}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mb-1.5">
            {t("body", "Add it to your home screen for a faster, native-like experience.")}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[11px] font-medium text-slate-950 disabled:opacity-60"
            >
              {installing ? t("installing", "Installing…") : t("install", "Install app")}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
            >
              {t("dismiss", "Not now")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
