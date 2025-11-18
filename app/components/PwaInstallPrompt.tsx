"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  // Android / desktop
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  // @ts-ignore
  if (window.navigator.standalone) return true;

  return false;
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If already installed, never show
    if (isStandaloneMode()) return;

    // Only show on mobile browsers
    if (!isMobileBrowser()) return;

    function handleBeforeInstallPrompt(e: Event) {
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

  if (!visible || !deferredPrompt) return null;

  async function handleInstallClick() {
    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      // You *could* hide forever if dismissed; for now we just hide this session
      setVisible(false);
      setDeferredPrompt(null);
      console.log("[pwa] userChoice:", choice);
    } catch (err) {
      console.error("[pwa] install error", err);
    } finally {
      setInstalling(false);
    }
  }

  function handleClose() {
    setVisible(false);
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9998] w-[95%] max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 shadow-xl px-3 py-2 flex items-center gap-2 text-xs">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-[11px] mb-0.5">
            Install AI Productivity Hub
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            Add it to your home screen like a native app.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="px-2 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-[10px] font-medium text-slate-950 disabled:opacity-60"
        >
          {installing ? "…" : "Install"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="px-1.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[10px] text-slate-300"
        >
          Later
        </button>
      </div>
    </div>
  );
}
