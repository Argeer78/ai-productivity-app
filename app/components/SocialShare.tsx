"use client";

import { useState } from "react";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ai-productivity-app-5zah.vercel.app";

export default function SocialShare() {
  const [copied, setCopied] = useState(false);

  const shareText =
    "I'm trying this AI notes & tasks app – AI Productivity Hub. Check it out:";
  const encodedUrl = encodeURIComponent(APP_URL);
  const encodedText = encodeURIComponent(shareText);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}%20${encodedUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Productivity Hub",
          text: shareText,
          url: APP_URL,
        });
      } catch (err) {
        // user might cancel; we don't need to show an error
        console.error("Share cancelled or failed", err);
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      <span>Share this app:</span>
      <div className="flex flex-wrap gap-2">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
        >
          X / Twitter
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
        >
          LinkedIn
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
        >
          {copied ? "✅ Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={handleNativeShare}
          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 hidden sm:inline"
        >
          📱 Share
        </button>
      </div>
    </div>
  );
}
