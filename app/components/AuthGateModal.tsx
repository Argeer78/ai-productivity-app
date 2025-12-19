"use client";

export default function AuthGateModal({
  open,
  onClose,
  title = "Log in to continue",
  subtitle = "Create an account to use this feature.",
  ctaHref = "/auth",
  ctaLabel = "Log in / Sign up",
  secondaryLabel = "Not now",
  footerHint = "You can still browse as a visitor.",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  footerHint?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={ctaHref}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            {ctaLabel}
          </a>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
          >
            {secondaryLabel}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-[var(--text-muted)]">{footerHint}</p>
      </div>
    </div>
  );
}
