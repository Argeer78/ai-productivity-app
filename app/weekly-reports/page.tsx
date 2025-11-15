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

export default function WeeklyReportsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [plan, setPlan] = useState<"free" | "pro">("free");
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

  // 2) Load plan + weekly reports (if pro)
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

        const userPlan = (profile?.plan as "free" | "pro") || "free";
        setPlan(userPlan);

        if (userPlan === "pro") {
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
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="weekly-reports" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Weekly Reports</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to see your weekly AI reports.
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="weekly-reports" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Weekly AI Reports
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                See how your AI usage, tasks, and notes add up week by week.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Plan pill */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Plan: <span className="font-semibold uppercase">{plan}</span>
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {/* Free plan: show locked state + teaser */}
          {plan === "free" && (
            <div className="rounded-2xl border border-indigo-500/60 bg-indigo-950/30 p-4 mb-6 text-xs">
              <p className="text-indigo-100 font-semibold mb-1">
                Weekly reports are a Pro feature
              </p>
              <p className="text-indigo-100 mb-2">
                Pro users automatically receive a weekly AI-written summary of
                their wins, productivity score, and focus suggestions for the
                next week. You&apos;ll also see a history of past reports here.
              </p>
              <p className="text-[11px] text-indigo-100/80 mb-3">
                Upgrade to Pro to unlock weekly reports, higher AI limits,
                and advanced goal tracking.
              </p>
              <Link
                href="/dashboard#pricing"
                className="inline-block px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-900 font-medium"
              >
                🔒 Unlock Weekly Reports with Pro
              </Link>
            </div>
          )}

          {/* Pro plan: show history */}
          {plan === "pro" && (
            <>
              {loading ? (
                <p className="text-slate-300 text-sm">
                  Loading your weekly reports...
                </p>
              ) : reports.length === 0 ? (
                <p className="text-slate-300 text-sm">
                  No weekly reports yet. You&apos;ll get your first report on
                  Sunday after your first full tracked week.
                </p>
              ) : (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <p className="text-[11px] text-slate-400 mb-1">
                        Week of{" "}
                        <span className="font-semibold">
                          {r.report_date}
                        </span>
                      </p>
                      <pre className="whitespace-pre-wrap text-[12px] text-slate-100">
                        {r.summary || "(empty report)"}
                      </pre>
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
