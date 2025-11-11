"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
const ADMIN_EMAILS = ["sgouros2305@gmail.com"];

type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  created_at: string;
};

export default function FeedbackPage() {
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

  // 2) Load all feedback (for now, anyone logged in can see it)
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
        setError("Failed to load feedback.");
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [user]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">Feedback</h1>
        <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
          You&apos;re not logged in. Log in to see feedback messages.
        </p>
        <Link
          href="/auth"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Go to login / signup
        </Link>
      </main>
    );
  }
// Only allow specific admin emails to view feedback
if (!ADMIN_EMAILS.includes(user.email)) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-3">Feedback</h1>
      <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
        This page is only available to the admin.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-900 text-sm"
      >
        Go back to home
      </Link>
    </main>
  );
}
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
                AI
              </div>
              <span className="text-sm font-semibold tracking-tight">
                AI Productivity Hub
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-3 text-xs text-slate-300">
              <Link href="/notes" className="hover:text-white">
                Notes
              </Link>
              <Link href="/tasks" className="hover:text-white">
                Tasks
              </Link>
              <Link href="/dashboard" className="hover:text-white">
                Dashboard
              </Link>
              <Link href="/feedback" className="hover:text-white">
                Feedback
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="hidden sm:inline text-slate-300">
              Logged in as <span className="font-semibold">{user.email}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Feedback
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Internal page showing all feedback messages stored in Supabase.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400">{error}</div>
          )}

          {loading ? (
            <p className="text-slate-300 text-sm">Loading feedback...</p>
          ) : feedback.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No feedback yet. Once users send messages from the app, they&apos;ll
              appear here.
            </p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              {feedback.map((fb) => (
                <article
                  key={fb.id}
                  className="border border-slate-800 rounded-2xl bg-slate-900/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-xs text-slate-400">
                      {fb.email ? (
                        <>
                          From{" "}
                          <span className="font-semibold">{fb.email}</span>
                        </>
                      ) : (
                        <span className="italic">Anonymous / not logged in</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {fb.created_at &&
                        new Date(fb.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-slate-100 text-sm whitespace-pre-wrap">
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
