// app/feedback/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

const ADMIN_EMAILS = ["sgouros2305@gmail.com"];

type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  created_at: string;
};

export default function FeedbackPage() {
  // ✅ build full keys (feedbackPage.*)
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) =>
    rawT(`feedbackPage.${key}`, fallback);

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  // 2) Load all feedback (only after user check)
  useEffect(() => {
    if (!user) return;

    async function loadFeedback() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFeedback((data || []) as FeedbackRow[]);
      } catch (err) {
        console.error(err);
        // you don't have feedbackPage.loadError key, so keep fallback
        setError(t("loadError", "Failed to load feedback."));
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [user]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">
          {t("checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm">
          <h1 className="text-2xl font-bold mb-3">
            {t("title", "Feedback")}
          </h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            {t(
              "notLoggedIn",
              "You're not logged in. Log in to see feedback messages."
            )}
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-soft)] text-sm text-slate-950 font-medium"
          >
            {t("goToAuth", "Go to login / signup")}
          </Link>
        </div>
      </main>
    );
  }

  // Only allow specific admin emails to view feedback
  if (!ADMIN_EMAILS.includes(user.email)) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm">
          <h1 className="text-2xl font-bold mb-3">
            {t("title", "Feedback")}
          </h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            {t("notAdmin", "This page is only available to the admin.")}
          </p>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-strong)] hover:bg-[var(--bg-card-soft)] text-sm"
          >
            {t("goHome", "Go back to home")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="feedback" />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t("title", "Feedback")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {t(
                  "subtitle",
                  "Internal page showing all feedback messages stored in Supabase."
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400">{error}</div>
          )}

          {loading ? (
            <p className="text-[13px] text-[var(--text-muted)]">
              {t("loading", "Loading feedback...")}
            </p>
          ) : feedback.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">
              {t(
                "noFeedback",
                "No feedback yet. Once users send messages from the app, they'll appear here."
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              {feedback.map((fb) => (
                <article
                  key={fb.id}
                  className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/80 p-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {fb.email ? (
                        <>
                          {t("rowFrom", "From")}{" "}
                          <span className="font-semibold text-[var(--text-main)]">
                            {fb.email}
                          </span>
                        </>
                      ) : (
                        <span className="italic">
                          {t("rowAnonymous", "Anonymous / not logged in")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--text-soft)]">
                      {fb.created_at &&
                        new Date(fb.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[13px] text-[var(--text-main)] whitespace-pre-wrap">
                    {fb.message}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
