"use client";

import { useState } from "react";
import { useAnalytics } from "@/app/lib/analytics";
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
track("share_clicked", { network: "native" });
  const appUrl =
    url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://ai-productivity-app.vercel.app");

  const shareData: ShareData = {
    title,
    text,
    url: appUrl,
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyLink();
      }
    } catch {
      // user cancelled or unsupported
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title} — ${text}`
  )}&url=${encodeURIComponent(appUrl)}`;

  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    appUrl
  )}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onShare}
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
        >
          Share
        </button>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
          aria-label="Share on X"
        >
          X
        </a>
        <a
          href={liHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
          aria-label="Share on LinkedIn"
        >
          in
        </a>
        <button
          onClick={copyLink}
          className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onShare}
        className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
      >
        Share
      </button>
      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
      >
        Share on X
      </a>
      <a
        href={liHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
      >
        Share on LinkedIn
      </a>
      <button
        onClick={copyLink}
        className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}
