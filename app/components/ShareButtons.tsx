"use client";

import { useState } from "react";
import { useAnalytics } from "@/lib/analytics";

type Props = {
  url?: string;
  title?: string;
  text?: string;
  compact?: boolean;
};

export default function ShareButtons({
  url,
  title = "AI Productivity Hub",
  text = "Notes, tasks, and an AI that actually helps.",
  compact = false,
}: Props) {

  const [copied, setCopied] = useState(false);
  const { track } = useAnalytics();

  const appUrl =
    url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://aiprod.app");

  const shareData: ShareData = {
    title,
    text,
    url: appUrl,
  };

  async function onShare() {
    try {
      track("share_clicked", { network: "native" });

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyLink();
      }
    } catch {
      // ignore — user canceled
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title} — ${text}`
  )}&url=${encodeURIComponent(appUrl)}`;

  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    appUrl
  )}`;

  /* === COMPACT VERSION ==== */
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onShare}
          className="px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-medium hover:opacity-90"
        >
          Share
        </button>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs"
          aria-label="Share on X"
        >
          X
        </a>
        <a
          href={liHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs"
          aria-label="Share on LinkedIn"
        >
          in
        </a>
        <button
          onClick={copyLink}
          className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    );
  }

  /* === FULL VERSION === */
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onShare}
        className="px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90"
      >
        Share
      </button>

      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-sm"
      >
        Share on X
      </a>

      <a
        href={liHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-sm"
      >
        Share on LinkedIn
      </a>

      <button
        onClick={copyLink}
        className="px-5 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-sm"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}
