"use client";

import { useEffect } from "react";
import AppHeader from "@/app/components/AppHeader";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ChangelogPage() {
  // Mark changelog as seen for the logged-in user
  useEffect(() => {
    let cancelled = false;

    async function markSeen() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[changelog] auth error", error);
          return;
        }
        const user = data?.user;
        if (!user || cancelled) return;

        await supabase
          .from("profiles")
          .update({
            latest_seen_changelog_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("[changelog] mark seen error", err);
      }
    }

    markSeen();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="changelog" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                What&apos;s new
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Recent updates, fixes, and experiments in AI Productivity Hub.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to dashboard
            </Link>
          </div>

          <div className="space-y-6">
            {/* Latest entry */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 mb-1">
                📅 {todayLabel} • Latest
              </p>
              <h2 className="text-sm font-semibold mb-2">
                Weekly AI reports, goals, and wins
              </h2>
              <ul className="list-disc list-inside text-[12px] text-slate-200 space-y-1">
                <li>
                  Added{" "}
                  <span className="font-semibold">
                    Weekly AI email report
                  </span>{" "}
                  for Pro users with productivity overview, wins, and focus
                  suggestions.
                </li>
                <li>
                  New{" "}
                  <span className="font-semibold">Weekly Reports page</span> to
                  see your report history.
                </li>
                <li>
                  Dashboard now shows{" "}
                  <span className="font-semibold">
                    AI Wins This Week
                  </span>{" "}
                  (tasks completed, notes created, AI calls, time saved).
                </li>
                <li>
                  Added{" "}
                  <span className="font-semibold">Goal of the Week</span> with
                  optional AI refinement and a “mark as done” toggle.
                </li>
              </ul>
            </section>

            {/* Productivity score entry */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 mb-1">📊 Recent</p>
              <h2 className="text-sm font-semibold mb-2">
                Productivity score & streaks
              </h2>
              <ul className="list-disc list-inside text-[12px] text-slate-200 space-y-1">
                <li>
                  New <span className="font-semibold">Daily Success</span> page
                  where you score your day from 0–100.
                </li>
                <li>
                  Dashboard now shows{" "}
                  <span className="font-semibold">
                    today&apos;s score, 7-day average
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold">score streak</span> (days ≥
                  60).
                </li>
                <li>
                  Added streak banner at the top of the dashboard with different
                  messages for 1+, 7+, 14+, and 30+ day streaks.
                </li>
              </ul>
            </section>

            {/* Templates entry */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 mb-1">🧠 Earlier</p>
              <h2 className="text-sm font-semibold mb-2">
                Templates, Pro gating, and assistant upgrades
              </h2>
              <ul className="list-disc list-inside text-[12px] text-slate-200 space-y-1">
                <li>
                  Added <span className="font-semibold">AI Templates</span>{" "}
                  with categories (Planning, Study, Writing, Work, Personal).
                </li>
                <li>
                  Introduced{" "}
                  <span className="font-semibold">Pro-only templates</span> with
                  locked actions and an upgrade flow.
                </li>
                <li>
                  Improved{" "}
                  <span className="font-semibold">
                    “Use with Assistant”
                  </span>{" "}
                  to pass clean context from templates, notes, and planner into
                  the floating AI assistant.
                </li>
              </ul>
            </section>

            {/* UI entry */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 mb-1">🧪 Ongoing</p>
              <h2 className="text-sm font-semibold mb-2">
                UI polish & navigation
              </h2>
              <ul className="list-disc list-inside text-[12px] text-slate-200 space-y-1">
                <li>
                  New <span className="font-semibold">Apps panel</span> in the
                  header to keep navigation clean while giving quick access to
                  all tools.
                </li>
                <li>
                  Header now always shows your{" "}
                  <span className="font-semibold">
                    email, Settings, and Log out
                  </span>{" "}
                  without being crushed.
                </li>
                <li>
                  Mobile navigation simplified with a single menu that includes
                  all pages.
                </li>
              </ul>
            </section>

            <p className="text-[11px] text-slate-500 mt-4">
              More improvements are in progress around focus, routines, and
              better AI guidance. If you have a feature request, you can always
              send it from the{" "}
              <Link
                href="/feedback"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Feedback
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
