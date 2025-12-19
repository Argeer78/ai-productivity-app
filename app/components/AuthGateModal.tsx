// app/components/AuthGateModal.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export type AuthGateCopy = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  footerHint?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // ✅ New API (used by useAuthGate)
  authHref?: string;
  copy?: AuthGateCopy;

  // ✅ Old API (backwards compatible)
  title?: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  footerHint?: string;
};

export default function AuthGateModal({
  open,
  onClose,

  authHref,
  copy,

  title,
  subtitle,
  ctaHref,
  ctaLabel,
  secondaryLabel,
  footerHint,
}: Props) {
  // Prefer new API when provided, else fall back to old
  const resolvedTitle = copy?.title ?? title ?? "Log in required";
  const resolvedSubtitle =
    copy?.subtitle ?? subtitle ?? "Please log in or create an account to continue.";
  const resolvedCtaHref = authHref ?? ctaHref ?? "/auth";
  const resolvedCtaLabel = copy?.ctaLabel ?? ctaLabel ?? "Log in / Sign up";
  const resolvedSecondaryLabel = copy?.secondaryLabel ?? secondaryLabel ?? "Not now";
  const resolvedFooterHint = copy?.footerHint ?? footerHint ?? "";

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xl">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">
            {resolvedTitle}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {resolvedSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={resolvedCtaHref}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            {resolvedCtaLabel}
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm"
          >
            {resolvedSecondaryLabel}
          </button>
        </div>

        {resolvedFooterHint ? (
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            {resolvedFooterHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
