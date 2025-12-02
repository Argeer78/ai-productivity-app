// app/weekly-history/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Plan = "free" | "pro" | "founder";

type WeeklyReport = {
  id: string;
  report_date: string | null;
  summary: string | null;
  created_at: string | null;
};

export default function WeeklyHistoryPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<Plan>("free");
  const isPro = plan === "pro" || plan === "founder";
  const planLabelUpper =
    plan === "founder" ? "FOUNDER" : plan.toUpperCase();

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load current user
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

  // Load plan + weekly reports
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        // 1) Plan from profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Weekly history: profile error", profileError);
        }

        const rawPlan = (profile?.plan as Plan | null) || "free";
        const userPlan: Plan =
          rawPlan === "pro" || rawPlan === "founder" ? rawPlan : "free";
        setPlan(userPlan);

        // 2) Weekly reports for this user
        const { data: reportsData, error: reportsError } = await supabase
          .from("weekly_reports")
          .select("id, report_date, summary, created_at")
          .eq("user_id", user.id)
          .order("report_date", { ascending: false })
          .limit(52); // up to ~1 year

        if (reportsError && reportsError.code !== "PGRST116") {
          console.error("Weekly history: reports error", reportsError);
          setReports([]);
          setError("Failed to load weekly reports.");
        } else {
          setReports((reportsData || []) as WeeklyReport[]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load weekly reports.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl font-bold mb-3">Weekly Reports</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to see your AI-generated weekly
            productivity reports.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  // Gating: only Pro/Founder users get weekly report history
  if (!isPro) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  Weekly Reports
                </h1>
                <p className="text-xs md:text-sm text-[var(--text-muted)]">
                  AI-generated summaries of your week, available with Pro.
                </p>
              </div>
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
              >
                ← Back to Settings
              </Link>
            </div>

            <div className="rounded-2xl border border-[var(--accent)]/60 bg-[var(--accent-soft)]/60 p-4 text-sm max-w-xl">
              <p className="text-[var(--text-main)] font-semibold mb-1">
                Weekly report history is a Pro feature
              </p>
              <p className="text-[var(--text-muted)] mb-3 text-[13px]">
                Upgrade to Pro to unlock weekly AI email reports and see a
                history of your progress, streaks, and focus suggestions over
                time.
              </p>
              <Link
                href="/dashboard#pricing"
                className="inline-block px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--bg-body)] font-medium text-xs"
              >
                🔒 Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="settings" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Weekly Reports
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Read your past AI-generated weekly productivity summaries.
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-muted)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Plan:{" "}
                  <span className="font-semibold uppercase text-[var(--text-main)]">
                    {planLabelUpper}
                  </span>
                </span>
              </div>
            </div>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to Settings
            </Link>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {loading ? (
            <p className="text-[var(--text-muted)] text-sm">
              Loading your weekly reports…
            </p>
          ) : reports.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              No weekly reports found yet. Once you&apos;ve used the app for a
              bit and keep weekly reports enabled, your AI summaries will appear
              here.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const dateLabel = r.report_date
                  ? new Date(r.report_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Unknown date";

                const createdLabel = r.created_at
                  ? new Date(r.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;

                const isExpanded = expandedId === r.id;
                const summaryText = r.summary || "";

                const preview =
                  summaryText.length > 260 && !isExpanded
                    ? summaryText.slice(0, 260) + "…"
                    : summaryText;

                return (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-semibold">
                        Week of {dateLabel}
                      </h2>
                      {createdLabel && (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Generated: {createdLabel}
                        </p>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text-main)] whitespace-pre-wrap mb-2">
                      {preview || "(Empty summary)"}
                    </p>
                    <div className="flex items-center gap-3 text-[11px]">
                      {summaryText.length > 260 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : r.id)
                          }
                          className="text-[var(--accent)] hover:opacity-90"
                        >
                          {isExpanded ? "Show less" : "Read full report"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!summaryText) return;
                          navigator.clipboard
                            .writeText(summaryText)
                            .catch((err) =>
                              console.error("Copy failed", err)
                            );
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        Copy text
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
