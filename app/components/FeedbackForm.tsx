"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAnalytics } from "@/lib/analytics";
import { useT } from "@/lib/useT";

type Status = "idle" | "sending" | "sent" | "error";

type FeedbackSource =
  | "dashboard"
  | "notes"
  | "tasks"
  | "landing"
  | "settings"
  | "unknown";

export default function FeedbackForm({
  user,
  source = "unknown",
}: {
  user?: any;
  source?: FeedbackSource;
}) {
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`feedback.${key}`, fallback);

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [showToast, setShowToast] = useState(false);
  const { track } = useAnalytics();

  const isSending = status === "sending";
  const canSubmit = !isSending && Boolean(message.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setStatus("sending");

      const { error } = await supabase.from("feedback").insert([
        {
          user_id: user?.id || null,
          email: user?.email || null,
          message: message.trim(),
          source, // make sure "source" column exists in Supabase if you use this
        },
      ]);

      if (error) throw error;

      try {
        track("feedback_submitted", {
          source,
          hasUser: Boolean(user?.id),
        });
      } catch {
        // never let analytics crash UX
      }

      setMessage("");
      setStatus("sent");
      setShowToast(true);
    } catch (err) {
      console.error("[feedback] submit error", err);
      setStatus("error");
      setShowToast(true);
    }
  }

  // Auto-hide toast after a short delay
  useEffect(() => {
    if (!showToast) return;

    const timer = setTimeout(() => {
      setShowToast(false);
      if (status === "sent" || status === "error") {
        setStatus("idle");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [showToast, status]);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4 mt-6"
      >
        <h3 className="text-sm font-semibold mb-2 text-[var(--text-main)] flex items-center gap-1">
          <span>💬</span>
          <span>{t("title", "Send feedback")}</span>
        </h3>

        <p className="text-xs text-[var(--text-muted)] mb-3">
          {t(
            "subtitle",
            "Got an idea or found a bug? Let me know!"
          )}
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("placeholder", "Type your message...")}
          className="w-full min-h-[80px] text-sm px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-main)] placeholder-[var(--text-muted)]/80"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-sm text-[var(--accent-contrast)]"
          >
            {isSending ? t("sending", "Sending…") : t("send", "Send")}
          </button>
        </div>
      </form>

      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
              status === "sent"
                ? "bg-emerald-600/95 border-emerald-300 text-white"
                : "bg-red-600/95 border-red-300 text-white"
            }`}
          >
            {status === "sent" ? (
              <span>{t("toast.sent", "✅ Feedback sent — thank you!")}</span>
            ) : (
              <span>
                {t("toast.error", "⚠️ Something went wrong. Please try again.")}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
