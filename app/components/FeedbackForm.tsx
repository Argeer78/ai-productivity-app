"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAnalytics } from "@/lib/analytics";

type Status = "idle" | "sending" | "sent" | "error";

export default function FeedbackForm({
  user,
  source = "unknown",
}: {
  user?: any;
  source?: "dashboard" | "notes" | "tasks" | "landing" | "settings" | "unknown";
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [showToast, setShowToast] = useState(false);
  const { track } = useAnalytics();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;

    try {
      setStatus("sending");

      const { error } = await supabase.from("feedback").insert([
        {
          user_id: user?.id || null,
          email: user?.email || null,
          message: message.trim(),
          // optionally add a 'source' column in your feedback table to store this
          // source,
        },
      ]);

      if (error) throw error;

      // track AFTER a successful write
      try {
        track("feedback_submitted", {
          source,
          hasUser: Boolean(user?.id),
        });
      } catch {
        // never let analytics crash the UX
      }

      setMessage("");
      setStatus("sent"); // triggers success toast
      setShowToast(true);
    } catch (err) {
      console.error(err);
      setStatus("error"); // triggers error toast
      setShowToast(true);
    }
  }

  // Auto-hide toast after a short delay
  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => {
      setShowToast(false);
      if (status === "sent") setStatus("idle");
    }, 2500);
    return () => clearTimeout(timer);
  }, [showToast, status]);

  const isSending = status === "sending";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4 mt-6"
      >
        <h3 className="text-sm font-semibold mb-2 text-slate-200">💬 Send feedback</h3>
        <p className="text-xs text-slate-400 mb-3">
          Got an idea or found a bug? Let me know!
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full min-h-[80px] text-sm px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 placeholder-slate-500"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSending || !message.trim()}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
              status === "sent"
                ? "bg-emerald-600/90 border-emerald-400 text-slate-50"
                : "bg-red-600/90 border-red-400 text-slate-50"
            }`}
          >
            {status === "sent" ? (
              <span>✅ Feedback sent — thank you!</span>
            ) : (
              <span>⚠️ Something went wrong. Please try again.</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
