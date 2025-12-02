// app/weekly-reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type WeeklyReport = {
  id: string;
  report_date: string;
  summary: string | null;
};

type PlanType = "free" | "pro" | "founder";

export default function WeeklyReportsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<PlanType>("free");
  const isPro = plan === "pro" || plan === "founder";
  const planLabelUpper =
    plan === "founder" ? "FOUNDER" : plan.toUpperCase();

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load user
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

  // 2) Load plan + weekly reports (if Pro / Founder)
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        // profiles: plan
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        const rawPlan = (profile?.plan as PlanType | null) || "free";
        const userPlan: PlanType =
          rawPlan === "pro" || rawPlan === "founder" ? rawPlan : "free";

        setPlan(userPlan);

        if (userPlan === "pro" || userPlan === "founder") {
          const { data: rows, error: reportsError } = await supabase
            .from("weekly_reports")
            .select("id, report_date, summary")
            .eq("user_id", user.id)
            .order("report_date", { ascending: false })
            .limit(12);

          if (reportsError && reportsError.code !== "PGRST116") {
            throw reportsError;
          }

          setReports((rows || []) as WeeklyReport[]);
        } else {
          setReports([]);
        }
      } catch (err: any) {
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
        <AppHeader active="weekly-reports" />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm">
          <h1 className="text-2xl font-bold mb-3">Weekly Reports</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm">
            Log in or create a free account to see your weekly AI reports.
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

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="weekly-reports" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Weekly AI Reports
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                See how your AI usage, tasks, and notes add up week by week.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Plan pill */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-muted)]">
              <span
                className={`h-2 w-2 rounded-full ${
                  isPro ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              Plan:{" "}
              <span className="font-semibold uppercase text-[var(--text-main)]">
                {planLabelUpper}
              </span>
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {/* Locked state for Free plan */}
          {!isPro && (
            <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/60 p-4 text-xs mb-6">
              <p className="text-[var(--accent-strong)] font-semibold mb-1">
                Weekly AI reports are a Pro feature.
              </p>
              <p className="text-[11px] text-[var(--text-main)]/80 mb-3">
                Upgrade to Pro to unlock weekly reports, higher AI limits, and
                advanced goal tracking.
              </p>

              <Link
                href="/dashboard#pricing"
                className="inline-block px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 font-medium text-xs"
              >
                🔒 Unlock Weekly Reports with Pro
              </Link>
            </div>
          )}

          {/* Pro / Founder: show history */}
          {isPro && (
            <>
              {loading ? (
                <p className="text-[var(--text-muted)] text-sm">
                  Loading your weekly reports...
                </p>
              ) : reports.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">
                  No weekly reports yet. You&apos;ll get your first report on
                  Sunday after your first full tracked week.
                </p>
              ) : (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <article
                      key={r.id}
                      className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">
                            Week of{" "}
                            {new Date(
                              r.report_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          href={`/weekly-reports/${r.id}`}
                          className="text-[11px] text-[var(--accent)] hover:opacity-90"
                        >
                          View full report →
                        </Link>
                      </div>

                      <div className="mt-2 text-[12px] text-[var(--text-main)] line-clamp-3 whitespace-pre-wrap">
                        {r.summary || "(no summary available)"}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
