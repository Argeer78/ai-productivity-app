"use client";

import { useEffect, useState } from "react";

type SocialShareBarProps = {
  title?: string;
  url?: string;
};

export default function SocialShareBar({
  title = "AI Productivity Hub",
  url,
}: SocialShareBarProps) {
  const [shareUrl, setShareUrl] = useState(url ?? "");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const current = url || window.location.href;
      setShareUrl(current);

      if ((navigator as any).share) {
        setCanNativeShare(true);
      }
    }
  }, [url]);

  async function handleNativeShare() {
    if (!canNativeShare || !shareUrl) return;
    try {
      await (navigator as any).share({
        title,
        url: shareUrl,
      });
    } catch {
      // user cancelled – ignore
    }
  }

  async function handleCopy() {
    if (!shareUrl || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl || "");
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-300">
      <span className="mr-1 font-medium text-slate-400">Share:</span>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
        >
          <span>📲</span>
          <span>Share</span>
        </button>
      )}

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
      >
        <span>𝕏</span>
        <span>Post</span>
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
      >
        <span>📘</span>
        <span>Facebook</span>
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
      >
        <span>💼</span>
        <span>LinkedIn</span>
      </a>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
      >
        <span>💬</span>
        <span>WhatsApp</span>
      </a>

      {/* Copy link */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 hover:bg-slate-800"
      >
        <span>🔗</span>
        <span>{copied ? "Copied!" : "Copy link"}</span>
      </button>
    </div>
  );
}
