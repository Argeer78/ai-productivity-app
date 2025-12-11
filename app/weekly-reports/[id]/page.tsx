"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

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

type PlanType = "free" | "pro" | "founder";

type PageProps = {
  params: { id: string };
};

export default function WeeklyReportDetailPage({ params }: PageProps) {
  const { t } = useT("weeklyReports");
  const { id } = params;

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<PlanType>("free");
  const isPro = plan === "pro" || plan === "founder";
  const planLabelUpper =
    plan === "founder" ? "FOUNDER" : plan.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [report, setReport] = useState<WeeklyReport | null>(null);

  const [actionPlan, setActionPlan] = useState<WeeklyActionPlan | null>(
    null
  );
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
          console.error(
            "[weekly-report-detail] profile error",
            profileError
          );
        }

        const rawPlan = (profile?.plan as PlanType | null) || "free";
        const userPlan: PlanType =
          rawPlan === "pro" || rawPlan === "founder" ? rawPlan : "free";
        setPlan(userPlan);

        // Weekly report by id (only for this user)
        const { data: reportRow, error: reportError } = await supabase
          .from("weekly_reports")
          .select("id, user_id, report_date, summary, created_at")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (reportError && reportError.code !== "PGRST116") {
          console.error(
            "[weekly-report-detail] weekly_reports error",
            reportError
          );
          setError(
            t("loadError", "Failed to load weekly report.")
          );
          setReport(null);
          setLoading(false);
          return;
        }

        if (!reportRow) {
          setError(
            t("notFoundError", "Weekly report not found.")
          );
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
          console.error(
            "[weekly-report-detail] weekly_action_plans error",
            planLoadError
          );
        }

        if (planRow) {
          setActionPlan(planRow as WeeklyActionPlan);
        } else {
          setActionPlan(null);
        }
      } catch (err) {
        console.error(err);
        setError(
          t("loadError", "Failed to load weekly report.")
        );
        setReport(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function handleGenerateActionPlan() {
    if (!user || !report) return;
    if (!isPro) return;

    setPlanLoading(true);
    setPlanError("");
    setPlanSuccess("");

    try {
      const res = await fetch("/api/weekly-action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          weekStart: report.report_date,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        console.error(
          "[weekly-report-detail] weekly-action-plan error",
          data
        );
        setPlanError(
          data?.error ||
            t(
              "planGenerateError",
              "Could not generate weekly action plan. Please try again."
            )
        );
        return;
      }

      if (data.plan) {
        setActionPlan({
          id: data.plan.id,
          week_start: data.plan.week_start,
          plan_text: data.plan.plan_text,
          created_at: data.plan.created_at,
        });
      }

      setPlanSuccess(
        t("planGenerateSuccess", "Weekly action plan generated.")
      );
    } catch (err) {
      console.error(err);
      setPlanError(
        t(
          "planNetworkError",
          "Network error while generating weekly action plan."
        )
      );
    } finally {
      setPlanLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          {t("checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="weekly-reports" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">
            {t("title", "Weekly Reports")}
          </h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            {t(
              "loginPrompt",
              "Log in or create a free account to view your weekly AI reports."
            )}
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            {t("goToAuth", "Go to login / signup")}
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="weekly-reports" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[var(--text-muted)] text-sm">
            {t("loadingReport", "Loading weekly report...")}
          </p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="weekly-reports" />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-[var(--text-muted)] text-sm mb-3">
            {error || t("notFoundError", "Weekly report not found.")}
          </p>
          <Link
            href="/weekly-reports"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            {t("backToList", "← Back to weekly reports")}
          </Link>
        </div>
      </main>
    );
  }

  const dateLabel = new Date(report.report_date).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="weekly-reports" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t("detailTitle", "Weekly Report")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {t("weekOfLabel", "Week of")} {dateLabel}
              </p>
            </div>
            <Link
              href="/weekly-reports"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              {t("backToList", "← Back to weekly reports")}
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
              {t("planLabel", "Plan:")}{" "}
              <span className="font-semibold uppercase text-[var(--text-main)]">
                {planLabelUpper}
              </span>
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {/* Report summary */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-6">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              {t("summaryLabel", "WEEKLY SUMMARY")}
            </p>
            <div className="text-[12px] text-[var(--text-main)] whitespace-pre-wrap">
              {report.summary ||
                t(
                  "noSummary",
                  "This weekly report has no summary text."
                )}
            </div>
          </section>

          {/* Weekly email note – only for non-Pro/non-Founder */}
          {!isPro && (
            <div className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/70 p-3 text-[11px] text-[var(--text-main)]">
              {t(
                "emailNote",
                "Weekly AI email reports are a Pro feature."
              )}
              <Link
                href="/dashboard#pricing"
                className="underline underline-offset-2 text-[var(--accent)] hover:opacity-90 ml-1"
              >
                {t("upgradeToPro", "Upgrade to Pro")}
              </Link>{" "}
              {t(
                "emailNoteTail",
                "to receive a summary in your inbox every week."
              )}
            </div>
          )}

          {/* Weekly Action Plan */}
          <section className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/70 p-4 mb-6">
            <p className="text-xs font-semibold text-[var(--accent-strong,_var(--accent))] mb-2">
              {t("actionPlanTitle", "WEEKLY ACTION PLAN (AI)")}
            </p>

            {planError && (
              <p className="text-[11px] text-red-400 mb-2">
                {planError}
              </p>
            )}
            {planSuccess && (
              <p className="text-[11px] text-emerald-400 mb-2">
                {planSuccess}
              </p>
            )}

            {!isPro ? (
              <>
                <p className="text-[12px] text-[var(--text-main)] mb-2">
                  {t(
                    "actionPlanProOnly",
                    "AI-powered weekly action plans are a Pro feature."
                  )}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">
                  {t(
                    "actionPlanProDesc",
                    "Upgrade to Pro to get a focused action plan for each week, based on your reports, tasks, and notes."
                  )}
                </p>
                <Link
                  href="/dashboard#pricing"
                  className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
                >
                  {t("unlockWithPro", "🔒 Unlock with Pro")}
                </Link>
              </>
            ) : (
              <>
                {actionPlan ? (
                  <div className="mb-3">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">
                      {t(
                        "savedPlanLabel",
                        "Your saved action plan for this week:"
                      )}
                    </p>
                    <div className="text-[12px] text-[var(--text-main)] whitespace-pre-wrap">
                      {actionPlan.plan_text}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--text-main)] mb-3">
                    {t(
                      "generatePlanHint",
                      "Generate a focused action plan for this week based on your report, tasks, notes, and productivity scores."
                    )}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGenerateActionPlan}
                  disabled={planLoading}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-xs font-medium disabled:opacity-60"
                >
                  {planLoading
                    ? t("generatingPlan", "Generating action plan...")
                    : actionPlan
                    ? t(
                        "regeneratePlan",
                        "Regenerate action plan"
                      )
                    : t(
                        "generatePlan",
                        "Generate weekly action plan"
                      )}
                </button>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  {t(
                    "planNote",
                    "This uses 1 AI call and overwrites the previous plan for this week (if any)."
                  )}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
