"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type WeeklyReport = {
  id: string;
  user_id: string;
  report_date: string;
  summary: string | null;
  created_at: string | null;
};

type WeeklyActionPlan = {
  id: string;
  week_start: string;
  plan_text: string;
  created_at: string | null;
};

type PageProps = {
  params: { id: string };
};

export default function WeeklyReportDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [report, setReport] = useState<WeeklyReport | null>(null);

  const [actionPlan, setActionPlan] = useState<WeeklyActionPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planSuccess, setPlanSuccess] = useState("");

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

  // 2) Load profile plan + report + existing weekly action plan
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      setError("");
      setPlanError("");
      setPlanSuccess("");

      try {
        // Profile (plan)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("[weekly-report-detail] profile error", profileError);
        }

        if (profile?.plan === "pro") setPlan("pro");
        else setPlan("free");

        // Weekly report by id (only for this user)
        const { data: reportRow, error: reportError } = await supabase
          .from("weekly_reports")
          .select("id, user_id, report_date, summary, created_at")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (reportError && reportError.code !== "PGRST116") {
          console.error("[weekly-report-detail] weekly_reports error", reportError);
          setError("Failed to load weekly report.");
          setReport(null);
          setLoading(false);
          return;
        }

        if (!reportRow) {
          setError("Weekly report not found.");
          setReport(null);
          setLoading(false);
          return;
        }

        const rep = reportRow as WeeklyReport;
        setReport(rep);

        // Try to load existing weekly action plan by week_start = report_date
        const { data: planRow, error: planLoadError } = await supabase
          .from("weekly_action_plans")
          .select("id, week_start, plan_text, created_at")
          .eq("user_id", user.id)
          .eq("week_start", rep.report_date)
          .maybeSingle();

        if (planLoadError && planLoadError.code !== "PGRST116") {
          console.error("[weekly-report-detail] weekly_action_plans error", planLoadError);
        }

        if (planRow) {
          setActionPlan(planRow as WeeklyActionPlan);
        } else {
          setActionPlan(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load weekly report.");
        setReport(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, id]);

  async function handleGenerateActionPlan() {
    if (!user || !report) return;
    if (plan !== "pro") return;

    setPlanLoading(true);
    setPlanError("");
    setPlanSuccess("");

    try {
      const res = await fetch("/api/weekly-action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          weekStart: report.report_date, // use this report's week as week_start
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        console.error("[weekly-report-detail] weekly-action-plan error", data);
        setPlanError(
          data?.error ||
            "Could not generate weekly action plan. Please try again."
        );
        return;
      }

      // Expecting data.plan.plan_text etc.
      if (data.plan) {
        setActionPlan({
          id: data.plan.id,
          week_start: data.plan.week_start,
          plan_text: data.plan.plan_text,
          created_at: data.plan.created_at,
        });
      }

      setPlanSuccess("Weekly action plan generated.");
    } catch (err) {
      console.error(err);
      setPlanError("Network error while generating weekly action plan.");
    } finally {
      setPlanLoading(false);
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
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Weekly Reports</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to view your weekly AI reports.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="dashboard" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-slate-300 text-sm">Loading weekly report...</p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-slate-300 text-sm mb-3">
            {error || "Weekly report not found."}
          </p>
          <Link
            href="/weekly-reports"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            ← Back to weekly reports
          </Link>
        </div>
      </main>
    );
  }

  const dateLabel = new Date(report.report_date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="dashboard" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Weekly Report
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Week of {dateLabel}
              </p>
            </div>
            <Link
              href="/weekly-reports"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to weekly reports
            </Link>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {/* Report summary */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-6">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              WEEKLY SUMMARY
            </p>
            <div className="text-[12px] text-slate-100 whitespace-pre-wrap">
              {report.summary || "This weekly report has no summary text."}
            </div>
          </section>

          {/* Weekly Action Plan */}
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 mb-6">
            <p className="text-xs font-semibold text-emerald-200 mb-2">
              WEEKLY ACTION PLAN (AI)
            </p>

            {planError && (
              <p className="text-[11px] text-red-300 mb-2">{planError}</p>
            )}
            {planSuccess && (
              <p className="text-[11px] text-emerald-200 mb-2">
                {planSuccess}
              </p>
            )}

            {plan !== "pro" ? (
              <>
                <p className="text-[12px] text-emerald-100 mb-2">
                  AI-powered weekly action plans are a Pro feature.
                </p>
                <p className="text-[11px] text-emerald-200/80 mb-3">
                  Upgrade to Pro to get a focused action plan for each week,
                  based on your reports, tasks, and notes.
                </p>
                <Link
                  href="/dashboard#pricing"
                  className="inline-block text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-50"
                >
                  🔒 Unlock with Pro
                </Link>
              </>
            ) : (
              <>
                {actionPlan ? (
                  <div className="mb-3">
                    <p className="text-[11px] text-emerald-200/80 mb-1">
                      Your saved action plan for this week:
                    </p>
                    <div className="text-[12px] text-emerald-50 whitespace-pre-wrap">
                      {actionPlan.plan_text}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-emerald-100 mb-3">
                    Generate a focused action plan for this week based on your
                    report, tasks, notes, and productivity scores.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGenerateActionPlan}
                  disabled={planLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-medium disabled:opacity-60"
                >
                  {planLoading
                    ? "Generating action plan..."
                    : actionPlan
                    ? "Regenerate action plan"
                    : "Generate weekly action plan"}
                </button>
                <p className="text-[11px] text-emerald-200/80 mt-1">
                  This uses 1 AI call and overwrites the previous plan for this
                  week (if any).
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
