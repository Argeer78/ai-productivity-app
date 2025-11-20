// app/components/InstallAppButton.tsx
"use client";

import { useState } from "react";
import { usePwaInstall } from "@/app/hooks/usePwaInstall";

export default function InstallAppButton() {
  const { canInstall, isStandalone, isIosSafari, install } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  // If app is already installed, hide the button entirely
  if (isStandalone) return null;

  // iOS Safari: show “how to install” help instead of a real prompt
  if (isIosSafari) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowIosHint((v) => !v)}
          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400"
        >
          Install app
        </button>
        {showIosHint && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 shadow-lg">
            <p className="font-semibold mb-1">Add to Home Screen</p>
            <p>
              In Safari, tap the{" "}
              <span className="font-semibold">Share</span> icon, then choose{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Other browsers: use native install prompt when available.
  // If `canInstall` is false, you can either hide the button or keep it disabled.
  const disabled = !canInstall;

  async function handleClick() {
    if (!canInstall) return;
    await install();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 disabled:opacity-50 disabled:hover:border-slate-700"
      title={
        disabled
          ? "App will be installable after you use it a bit."
          : "Install AI Productivity Hub"
      }
    >
      Install app
    </button>
  );
}
