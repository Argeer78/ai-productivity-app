// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import AppHeader from "@/app/components/AppHeader";
import SetupBanner from "@/app/components/SetupBanner";

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

type DailyScoreRow = {
  score_date: string;
  score: number;
};

function getStreakConfig(streak: number) {
  if (streak >= 30) {
    return {
      emoji: "🏆",
      title: "Legendary streak!",
      subtitle:
        "You’ve been consistently productive for 30+ days. That’s huge.",
      gradient: "from-amber-400 via-pink-500 to-indigo-600",
    };
  }
  if (streak >= 14) {
    return {
      emoji: "⚡",
      title: "Impressive streak!",
      subtitle: "14+ days in a row using AI to move things forward.",
      gradient: "from-purple-500 to-pink-500",
    };
  }
  if (streak >= 7) {
    return {
      emoji: "🔥",
      title: "Strong streak!",
      subtitle: "A full week of momentum. Keep riding it.",
      gradient: "from-emerald-500 to-teal-500",
    };
  }

  return {
    emoji: "🎉",
    title: "Nice streak!",
    subtitle:
      "You’re building a habit. A few more days and it becomes automatic.",
    gradient: "from-indigo-600 to-purple-600",
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [aiCountToday, setAiCountToday] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [streak, setStreak] = useState(0); // AI usage streak
  const [activeDays, setActiveDays] = useState(0);

  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Productivity score state (from daily_scores)
  const [scoreLoading, setScoreLoading] = useState(true);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [avg7, setAvg7] = useState<number | null>(null);
  const [scoreStreak, setScoreStreak] = useState<number>(0); // consecutive days with score >= 60

  // AI Wins this Week
  const [weekTasksCompleted, setWeekTasksCompleted] = useState(0);
  const [weekNotesCreated, setWeekNotesCreated] = useState(0);
  const [weekAiCalls, setWeekAiCalls] = useState(0);
  const [weekTimeSaved, setWeekTimeSaved] = useState(0); // in minutes

  // Weekly goal state
  const [weeklyGoalId, setWeeklyGoalId] = useState<string | null>(null);
  const [weeklyGoalText, setWeeklyGoalText] = useState<string>("");
  const [weeklyGoalCompleted, setWeeklyGoalCompleted] =
    useState<boolean>(false);
  const [weeklyGoalSaving, setWeeklyGoalSaving] = useState(false);
  const [weeklyGoalMarking, setWeeklyGoalMarking] = useState(false);

  const { track } = useAnalytics();

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);
  const showBanner = streak >= 1;
  const streakCfg = getStreakConfig(streak);

  // 🌍 currency state for multi-currency checkout
  const [currency, setCurrency] = useState<"eur" | "usd" | "gbp">("eur");

  async function startCheckout(selectedCurrency: "eur" | "usd" | "gbp") {
    if (!user) return;

    setBillingLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          currency: selectedCurrency,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        console.error("[checkout] error payload", data);
        setError(data?.error || "Could not start checkout.");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[checkout] exception", err);
      setError("Network error while starting checkout.");
    } finally {
      setBillingLoading(false);
    }
  }

  // Load the current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  // Load productivity score stats (daily_scores)
  useEffect(() => {
    if (!user) {
      setScoreLoading(false);
      setTodayScore(null);
      setAvg7(null);
      setScoreStreak(0);
      return;
    }

    async function loadScoreStats() {
      setScoreLoading(true);

      try {
        const todayStr = getTodayString();

        const past = new Date();
        past.setDate(past.getDate() - 30);
        const pastStr = past.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("daily_scores")
          .select("score_date, score")
          .eq("user_id", user.id)
          .gte("score_date", pastStr)
          .order("score_date", { ascending: true });

        if (error) {
          console.error("Dashboard: load score error", error);
          return;
        }

        const list = (data || []) as DailyScoreRow[];

        // Today
        const todayRow = list.find((r) => r.score_date === todayStr);
        setTodayScore(todayRow ? todayRow.score : null);

        // 7-day average
        const seven = new Date();
        seven.setDate(seven.getDate() - 6);
        const sevenStr = seven.toISOString().split("T")[0];

        const last7 = list.filter((r) => r.score_date >= sevenStr);

        if (last7.length > 0) {
          const avg =
            last7.reduce((sum, r) => sum + (r.score || 0), 0) /
            last7.length;
          setAvg7(Math.round(avg));
        } else {
          setAvg7(null);
        }

        // streak = days in a row with score ≥ 60
        const goodSet = new Set(
          list.filter((r) => r.score >= 60).map((r) => r.score_date)
        );

        let streakCount = 0;
        let current = new Date();

        for (let i = 0; i < 365; i++) {
          const dStr = current.toISOString().split("T")[0];
          if (goodSet.has(dStr)) {
            streakCount++;
            current.setDate(current.getDate() - 1);
          } else {
            break;
          }
        }

        setScoreStreak(streakCount);
      } catch (err) {
        console.error(err);
      } finally {
        setScoreLoading(false);
      }
    }

    loadScoreStats();
  }, [user]);

  // Ensure profile exists & load plan + AI usage + streak + recent activity + weekly goal
  useEffect(() => {
    if (!user) {
      setPlan("free");
      setAiCountToday(0);
      setStreak(0);
      setActiveDays(0);
      setRecentNotes([]);
      setRecentTasks([]);
      setWeekAiCalls(0);
      setWeekTimeSaved(0);
      setWeekNotesCreated(0);
      setWeekTasksCompleted(0);
      setWeeklyGoalId(null);
      setWeeklyGoalText("");
      setWeeklyGoalCompleted(false);
      return;
    }

    async function loadData() {
      setLoadingData(true);
      setError("");

      try {
        // 1) profiles: ensure profile exists & load plan
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, plan")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (!profile) {
          const { data: inserted, error: insertError } = await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                email: user.email,
                plan: "free",
              },
            ])
            .select("plan")
            .single();

          if (insertError) throw insertError;
          setPlan((inserted?.plan as "free" | "pro") || "free");
        } else {
          setPlan((profile.plan as "free" | "pro") || "free");
        }

        // 2) Today’s AI usage
        const today = getTodayString();
        const { data: usage, error: usageError } = await supabase
          .from("ai_usage")
          .select("count, usage_date")
          .eq("user_id", user.id)
          .eq("usage_date", today)
          .maybeSingle();

        if (usageError && usageError.code !== "PGRST116") {
          throw usageError;
        }

        const todayCount = usage?.count || 0;
        setAiCountToday(todayCount);

        // 3) ai_usage history: last 30 days
        const past = new Date();
        past.setDate(past.getDate() - 30);
        const pastStr = past.toISOString().split("T")[0];

        const { data: history, error: historyError } = await supabase
          .from("ai_usage")
          .select("usage_date, count")
          .eq("user_id", user.id)
          .gte("usage_date", pastStr)
          .order("usage_date", { ascending: true });

        if (historyError && historyError.code !== "PGRST116") {
          console.error("Dashboard: history error", historyError);
        }

        const historyList =
          (history || []) as { usage_date: string; count: number }[];

        // Active days (any AI usage) in last 30 days
        const active = historyList.filter((h) => h.count > 0).length;
        setActiveDays(active);

        // AI usage streak (consecutive days with usage > 0)
        const activeDateSet = new Set(
          historyList
            .filter((h) => h.count > 0)
            .map((h) => h.usage_date)
        );

        let streakCount = 0;
        let currentDate = new Date();

        for (let i = 0; i < 365; i++) {
          const dayStr = currentDate.toISOString().split("T")[0];
          if (activeDateSet.has(dayStr)) {
            streakCount += 1;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }

        setStreak(streakCount);

        // 4) AI Wins: last 7 days usage and time saved
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

        const last7Usage = historyList.filter(
          (h) => h.usage_date >= sevenStr
        );
        const totalAiCalls7 = last7Usage.reduce(
          (sum, h) => sum + (h.count || 0),
          0
        );
        setWeekAiCalls(totalAiCalls7);

        // Simple heuristic: ~3 minutes saved per AI call
        const estimatedMins = Math.round(totalAiCalls7 * 3);
        setWeekTimeSaved(estimatedMins);

        // 5) Recent notes
        const { data: notes, error: notesError } = await supabase
          .from("notes")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (notesError && notesError.code !== "PGRST116") {
          console.error("Dashboard: notes error", notesError);
          setRecentNotes([]);
        } else {
          setRecentNotes(notes || []);
        }

        // 6) Recent tasks
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, title, completed, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (tasksError && tasksError.code !== "PGRST116") {
          console.error("Dashboard: tasks error", tasksError);
          setRecentTasks([]);
        } else {
          setRecentTasks(tasks || []);
        }

        // 7) Notes / tasks in last 7 days
        const sevenDaysAgoDate = new Date();
        sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
        const sevenDateStr =
          sevenDaysAgoDate.toISOString().split("T")[0];

        const {
          count: notes7Count,
          error: notes7Err,
        } = await supabase
          .from("notes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", sevenDateStr);

        if (notes7Err && (notes7Err as any).code !== "PGRST116") {
          console.error("[dashboard] notes7 count error", notes7Err);
          setWeekNotesCreated(0);
        } else {
          setWeekNotesCreated(notes7Count ?? 0);
        }

        // Tasks completed in the last 7 days
        const sevenDaysAgoTs = new Date();
        sevenDaysAgoTs.setDate(sevenDaysAgoTs.getDate() - 6);
        const sevenDateOnly = sevenDaysAgoTs.toISOString().split("T")[0];

        const {
          data: tasks7Rows,
          error: tasks7Err,
        } = await supabase
          .from("tasks")
          .select("id")
          .eq("user_id", user.id)
          .eq("completed", true)
          .gte("created_at", sevenDateOnly);

        if (tasks7Err && (tasks7Err as any).code !== "PGRST116") {
          console.error("[dashboard] tasks7 error", tasks7Err);
          setWeekTasksCompleted(0);
        } else {
          setWeekTasksCompleted(tasks7Rows?.length || 0);
        }

        // 8) Weekly goal of the week (latest)
        const { data: goalRow, error: goalError } = await supabase
          .from("weekly_goals")
          .select("id, goal_text, week_start, completed")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (goalError && goalError.code !== "PGRST116") {
          console.error("Dashboard: weekly_goals error", goalError);
        } else if (goalRow) {
          setWeeklyGoalId(goalRow.id);
          setWeeklyGoalText(goalRow.goal_text || "");
          setWeeklyGoalCompleted(!!goalRow.completed);
        } else {
          setWeeklyGoalId(null);
          setWeeklyGoalText("");
          setWeeklyGoalCompleted(false);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [user]);

  async function saveWeeklyGoal(refineWithAI: boolean) {
    if (!user) return;
    const text = weeklyGoalText.trim();
    if (!text) return;

    setWeeklyGoalSaving(true);
    try {
      const res = await fetch("/api/weekly-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          goalText: text,
          refine: refineWithAI,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        console.error("Weekly goal save error:", data);
        alert(data?.error || "Could not save weekly goal.");
        return;
      }

      if (data.goal) {
        setWeeklyGoalId(data.goal.id);
        setWeeklyGoalText(data.goal.goal_text || text);
        setWeeklyGoalCompleted(!!data.goal.completed);
      }
    } catch (err) {
      console.error(err);
      alert("Network error while saving weekly goal.");
    } finally {
      setWeeklyGoalSaving(false);
    }
  }

  async function toggleWeeklyGoalCompleted() {
    if (!user || !weeklyGoalId) return;

    const newCompleted = !weeklyGoalCompleted;
    setWeeklyGoalMarking(true);

    try {
      const { error } = await supabase
        .from("weekly_goals")
        .update({ completed: newCompleted })
        .eq("id", weeklyGoalId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Weekly goal complete toggle error:", error);
        alert("Could not update goal status.");
        return;
      }

      setWeeklyGoalCompleted(newCompleted);
    } catch (err) {
      console.error(err);
      alert("Network error while updating goal status.");
    } finally {
      setWeeklyGoalMarking(false);
    }
  }

  async function generateSummary() {
    if (!user) return;
    if (aiCountToday >= dailyLimit) {
      setSummaryError(
        "You’ve reached today’s AI limit on your current plan. Try again tomorrow or upgrade to Pro."
      );
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const text = await res.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from /api/ai-summary:", text);
        setSummaryError("Server returned an invalid response.");
        setSummaryLoading(false);
        return;
      }

      if (!res.ok || !data.summary) {
        console.error("AI summary error payload:", data);
        if (res.status === 429) {
          setSummaryError(
            data.error || "You’ve reached today’s AI limit for your plan."
          );
        } else {
          setSummaryError(data.error || "Failed to generate summary.");
        }
        setSummaryLoading(false);
        return;
      }

      setSummary(data.summary);

      if (typeof data.usedToday === "number") {
        setAiCountToday(data.usedToday);
      } else {
        setAiCountToday((prev) => prev + 1);
      }

      try {
        track("ai_call_used", {
          feature: "summary",
          plan,
          usedToday:
            typeof data.usedToday === "number"
              ? data.usedToday
              : aiCountToday + 1,
        });
      } catch {
        // ignore analytics error
      }
    } catch (err) {
      console.error(err);
      setSummaryError("Network error while generating summary.");
    } finally {
      setSummaryLoading(false);
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
        <h1 className="text-2xl font-bold mb-3">Dashboard</h1>
        <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
          You&apos;re not logged in. Log in or create a free account to see
          your plan and AI usage.
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="dashboard" />

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          {/* ✅ Finish setup banner */}
          <SetupBanner userId={user.id} />

          {showBanner && (
            <div
              className={`mb-6 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${streakCfg.gradient} text-white shadow-md`}
            >
              <div>
                <p className="font-semibold text-sm md:text-base">
                  {streakCfg.emoji} {streakCfg.title} You’re on a{" "}
                  <span className="font-bold">{streak}-day</span>{" "}
                  productivity streak.
                </p>
                <p className="text-xs opacity-90">
                  {streakCfg.subtitle}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Quick overview of your plan, AI usage, and activity.
              </p>
            </div>

            <div className="mb-4 text-xs md:text-sm text-slate-300">
              <p>
                Plan:{" "}
                <span className="font-semibold uppercase">{plan}</span> | AI
                today:{" "}
                <span className="font-semibold">
                  {aiCountToday}/{dailyLimit}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                This includes notes AI, the global assistant, summary, and
                planner.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60">
                Plan:{" "}
                <span className="font-semibold">
                  {plan.toUpperCase()}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60">
                AI today: {aiCountToday}/{dailyLimit}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400">{error}</div>
          )}

          {loadingData ? (
            <p className="text-slate-300 text-sm">
              Loading your data...
            </p>
          ) : (
            <>
              {/* Top stats grid */}
              <div className="grid md:grid-cols-3 gap-5 mb-8 text-sm">
                {/* Account card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    ACCOUNT
                  </p>
                  <p className="text-slate-100 mb-1 text-sm break-all">
                    {user.email}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This is the account you use to log in.
                  </p>
                </div>

                {/* Plan card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    PLAN
                  </p>
                  <p className="text-slate-100 mb-1 text-sm">
                    {plan === "pro" ? "Pro" : "Free"}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {plan === "pro"
                      ? "Higher daily AI limits and more room to experiment."
                      : "Good for trying the app and light daily use."}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Daily AI limit:{" "}
                    <span className="font-semibold">
                      {dailyLimit} calls/day
                    </span>
                  </p>

                  {plan === "pro" && (
                    <Link
                      href="/weekly-reports"
                      className="inline-block mt-3 text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      📅 View Weekly Reports →
                    </Link>
                  )}

                  {plan === "free" && (
                    <Link
                      href="/dashboard#pricing"
                      className="inline-block mt-3 text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      🔒 Unlock Weekly Reports with Pro →
                    </Link>
                  )}
                </div>

                {/* Usage + Productivity Score card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    TODAY&apos;S AI USAGE
                  </p>
                  <p className="text-slate-100 mb-1 text-sm">
                    {aiCountToday}/{dailyLimit} used
                  </p>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${Math.min(
                          dailyLimit > 0
                            ? (aiCountToday / dailyLimit) * 100
                            : 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Productivity Score Widget */}
                  <div className="border border-slate-800 bg-slate-900/90 rounded-2xl p-3 mt-3">
                    <h3 className="text-sm font-semibold mb-2">
                      📈 Productivity Score
                    </h3>

                    {scoreLoading ? (
                      <p className="text-[11px] text-slate-400">
                        Loading...
                      </p>
                    ) : (
                      <>
                        <p className="text-[13px] mb-1">
                          <span className="text-slate-400">Today:</span>{" "}
                          <span className="font-semibold">
                            {todayScore !== null
                              ? `${todayScore}/100`
                              : "—"}
                          </span>
                        </p>

                        <p className="text-[13px] mb-1">
                          <span className="text-slate-400">
                            7-day avg:
                          </span>{" "}
                          <span className="font-semibold">
                            {avg7 !== null ? `${avg7}` : "—"}
                          </span>
                        </p>

                        <p className="text-[13px] mb-3">
                          <span className="text-slate-400">
                            Score streak (≥60):
                          </span>{" "}
                          <span className="font-semibold">
                            {scoreStreak} day
                            {scoreStreak === 1 ? "" : "s"}
                          </span>
                        </p>

                        <Link
                          href="/daily-success"
                          className="inline-block text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500"
                        >
                          Update today&apos;s score
                        </Link>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    {remaining > 0 ? (
                      `${remaining} AI calls left today.`
                    ) : plan === "pro" ? (
                      "You reached today’s Pro limit for today."
                    ) : (
                      <>
                        You reached today’s limit on the free plan.{" "}
                        <Link
                          href="/dashboard#pricing"
                          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                        >
                          Upgrade to Pro
                        </Link>{" "}
                        for a higher daily AI limit.
                      </>
                    )}
                  </p>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Usage streak:{" "}
                    <span className="font-semibold">
                      {streak} day{streak === 1 ? "" : "s"}
                    </span>{" "}
                    in a row • Active days (last 30):{" "}
                    <span className="font-semibold">{activeDays}</span>
                  </p>
                </div>

                {/* AI Summary card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-3">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    AI SUMMARY (BETA)
                  </p>
                  {summary ? (
                    <div className="text-[12px] text-slate-100 whitespace-pre-wrap mb-2">
                      {summary}
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-400 mb-2">
                      Let AI scan your recent notes and tasks and give you a
                      short overview plus suggestions.
                    </p>
                  )}

                  {summaryError && (
                    <p className="text-[11px] text-red-400 mb-2">
                      {summaryError}
                    </p>
                  )}

                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading || aiCountToday >= dailyLimit}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs md:text-sm"
                  >
                    {summaryLoading
                      ? "Generating..."
                      : aiCountToday >= dailyLimit
                      ? "Daily AI limit reached"
                      : "Generate summary"}
                  </button>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Uses your daily AI limit (shared with notes, assistant,
                    planner).
                  </p>
                </div>
              </div>

              {/* AI Wins This Week */}
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 mb-8 text-sm">
                <p className="text-xs font-semibold text-emerald-200 mb-1">
                  AI WINS THIS WEEK
                </p>
                <p className="text-[11px] text-emerald-100/80 mb-3">
                  A quick snapshot of how AI helped you move things forward in
                  the last 7 days.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <p className="text-emerald-300 text-xs mb-0.5">
                      Avg productivity score
                    </p>
                    <p className="text-base font-semibold">
                      {avg7 !== null ? `${avg7}/100` : "—"}
                    </p>
                    <p className="text-[11px] text-emerald-200/70">
                      Based on your daily scores
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-300 text-xs mb-0.5">
                      Tasks completed
                    </p>
                    <p className="text-base font-semibold">
                      {weekTasksCompleted}
                    </p>
                    <p className="text-[11px] text-emerald-200/70">
                      Last 7 days
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-300 text-xs mb-0.5">
                      Notes created
                    </p>
                    <p className="text-base font-semibold">
                      {weekNotesCreated}
                    </p>
                    <p className="text-[11px] text-emerald-200/70">
                      Captured ideas & thoughts
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-300 text-xs mb-0.5">
                      AI calls used
                    </p>
                    <p className="text-base font-semibold">
                      {weekAiCalls}
                    </p>
                    <p className="text-[11px] text-emerald-200/70">
                      ~{weekTimeSaved} min saved
                    </p>
                  </div>
                </div>
              </div>

              {/* Goal of the Week */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 mb-8 text-sm">
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  GOAL OF THE WEEK
                </p>

                {plan !== "pro" ? (
                  <>
                    <p className="text-[13px] text-slate-200 mb-1">
                      Set a clear weekly focus goal and let AI help you stay
                      on track.
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      This is a Pro feature. Upgrade to unlock AI-powered
                      weekly goals, progress tracking in your weekly report
                      emails, and higher AI limits.
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
                    <p className="text-[12px] text-slate-300 mb-2">
                      Pick one meaningful outcome you want to achieve this
                      week. Keep it small and realistic.
                    </p>
                    <textarea
                      value={weeklyGoalText}
                      onChange={(e) => setWeeklyGoalText(e.target.value)}
                      placeholder="e.g. Finish and send the client proposal draft."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 mb-2 min-h-[60px]"
                    />
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => saveWeeklyGoal(false)}
                        disabled={
                          weeklyGoalSaving || !weeklyGoalText.trim()
                        }
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs"
                      >
                        {weeklyGoalSaving ? "Saving..." : "Save goal"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveWeeklyGoal(true)}
                        disabled={
                          weeklyGoalSaving || !weeklyGoalText.trim()
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs disabled:opacity-60"
                      >
                        {weeklyGoalSaving
                          ? "Saving..."
                          : "Save & let AI refine"}
                      </button>
                    </div>

                    {weeklyGoalId && (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={toggleWeeklyGoalCompleted}
                          disabled={weeklyGoalMarking}
                          className={`px-3 py-1.5 rounded-xl text-xs border ${
                            weeklyGoalCompleted
                              ? "border-emerald-500 text-emerald-300 bg-emerald-900/30"
                              : "border-slate-700 text-slate-200 hover:bg-slate-900"
                          } disabled:opacity-60`}
                        >
                          {weeklyGoalCompleted
                            ? "✅ Marked as done"
                            : "Mark this goal as done"}
                        </button>
                        <span className="text-[11px] text-slate-500">
                          This is your single focus target for this week.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Recent activity */}
              <div className="grid md:grid-cols-2 gap-5 mb-8 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    RECENT NOTES
                  </p>
                  {recentNotes.length === 0 ? (
                    <p className="text-[12px] text-slate-500">
                      No notes yet. Create your first note from the Notes
                      page.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentNotes.map((n) => (
                        <li
                          key={n.id}
                          className="text-[12px] text-slate-200 line-clamp-2"
                        >
                          {n.content?.slice(0, 160) ||
                            "(empty note)"}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/notes"
                    className="mt-3 inline-block text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Open Notes →
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    RECENT TASKS
                  </p>
                  {recentTasks.length === 0 ? (
                    <p className="text-[12px] text-slate-500">
                      No tasks yet. Start by adding a few tasks you want to
                      track.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentTasks.map((t) => (
                        <li
                          key={t.id}
                          className="text-[12px] text-slate-200 flex items-center gap-2 line-clamp-2"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              t.completed
                                ? "bg-emerald-400"
                                : "bg-slate-500"
                            }`}
                          />
                          <span>
                            {t.title || "(untitled task)"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/tasks"
                    className="mt-3 inline-block text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Open Tasks →
                  </Link>

                  <Link
                    href="/settings"
                    className="mt-3 inline-block text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Settings / Export →
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Link
              href="/notes"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
            >
              Go to Notes
            </Link>
            <Link
              href="/tasks"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              Go to Tasks
            </Link>
            <Link
              href="/feedback"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              💬 Feedback
            </Link>
            <Link
              href="/templates"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              🧠 AI Templates
            </Link>
            <Link
              href="/planner"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              🗓 Daily Planner
            </Link>
            <Link
              href="/weekly-reports"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              📅 Weekly Reports
            </Link>
          </div>

          {plan === "free" && (
            <>
              <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-3 text-[11px] text-indigo-100 flex flex-wrap gap-3 items-center">
                <span className="font-semibold text-xs">
                  What you unlock with Pro:
                </span>
                <span>📈 Higher daily AI limit</span>
                <span>📬 Weekly AI email report</span>
                <span>✅ Goal of the Week with AI refinement</span>
                <span>🏅 Full AI wins history</span>
              </div>

              <section
                id="pricing"
                className="rounded-2xl border border-indigo-500/60 bg-indigo-950/40 p-5 text-xs md:text-sm max-w-xl"
              >
                <p className="text-indigo-100 font-semibold mb-1 text-sm md:text-base">
                  Unlock AI Productivity Hub Pro
                </p>
                <p className="text-indigo-100 mb-3">
                  Ideal if you&apos;re using the app most days and keep
                  hitting the free AI limit.
                </p>

                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-2xl font-bold text-indigo-100">
                    €9.99
                    <span className="text-base font-normal text-indigo-200">
                      /month
                    </span>
                  </p>
                  <p className="text-[11px] text-indigo-200/80">
                    Billed via secure Stripe checkout
                  </p>
                </div>

                <ul className="space-y-1.5 text-[11px] text-indigo-100/90 mb-4">
                  <li>
                    • 10× higher daily AI limit (notes, planner, assistant,
                    summaries)
                  </li>
                  <li>
                    • Weekly AI email reports with wins, stats & focus
                    suggestions
                  </li>
                  <li>
                    • Weekly goal coaching (set + mark your single focus
                    goal)
                  </li>
                  <li>• Access to Pro-only AI templates</li>
                  <li>• Priority for new features & improvements</li>
                </ul>

                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as "eur" | "usd" | "gbp")
                    }
                    className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs mb-2 sm:mb-0"
                  >
                    <option value="eur">EUR €</option>
                    <option value="usd">USD $</option>
                    <option value="gbp">GBP £</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => startCheckout(currency)}
                    disabled={billingLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white disabled:opacity-60"
                  >
                    {billingLoading
                      ? "Opening Stripe..."
                      : `Upgrade to Pro (${currency.toUpperCase()})`}
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-indigo-100/70">
                  Cancel any time from Settings → Manage subscription
                  (Stripe).
                </p>
              </section>
            </>
          )}
        </div>

        <FeedbackForm user={user} source="dashboard" />
      </div>
    </main>
  );
}
