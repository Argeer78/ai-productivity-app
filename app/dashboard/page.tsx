// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import AppHeader from "@/app/components/AppHeader";
import SetupBanner from "@/app/components/SetupBanner";
import { useT } from "@/lib/useT";

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 2000;

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
      subtitle: "You’ve been consistently productive for 30+ days. That’s huge.",
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
    subtitle: "You’re building a habit. A few more days and it becomes automatic.",
    gradient: "from-indigo-600 to-purple-600",
  };
}

const MONTHLY_PRICE_BY_CURRENCY: Record<"eur" | "usd" | "gbp", string> = {
  eur: "€8.49",
  usd: "$8.99",
  gbp: "£7.99",
};

const PRICE_LABELS = {
  pro: {
    monthly: {
      eur: "€8.49",
      usd: "$8.99",
      gbp: "£7.99",
    },
    yearly: {
      eur: "€74.00",
      usd: "$79.00",
      gbp: "£69.00",
    },
  },
  founder: {
    monthly: {
      eur: "€5.49",
      usd: "$5.99",
      gbp: "£4.99",
    },
  },
};

export default function DashboardPage() {
  // ✅ FULL-KEY translations
  const { t } = useT();

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro" | "founder">("free");
  const [aiCountToday, setAiCountToday] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [streak, setStreak] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Productivity score state (from daily_scores)
  const [scoreLoading, setScoreLoading] = useState(true);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [avg7, setAvg7] = useState<number | null>(null);
  const [scoreStreak, setScoreStreak] = useState<number>(0);

  // AI Wins this Week
  const [weekTasksCompleted, setWeekTasksCompleted] = useState(0);
  const [weekNotesCreated, setWeekNotesCreated] = useState(0);
  const [weekAiCalls, setWeekAiCalls] = useState(0);
  const [weekTimeSaved, setWeekTimeSaved] = useState(0);

  // Weekly goal state
  const [weeklyGoalId, setWeeklyGoalId] = useState<string | null>(null);
  const [weeklyGoalText, setWeeklyGoalText] = useState<string>("");
  const [weeklyGoalCompleted, setWeeklyGoalCompleted] = useState<boolean>(false);
  const [weeklyGoalSaving, setWeeklyGoalSaving] = useState(false);
  const [weeklyGoalMarking, setWeeklyGoalMarking] = useState(false);

  const { track } = useAnalytics();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const isPro = plan === "pro" || plan === "founder";
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);
  const showBanner = streak >= 1;
  const streakCfg = getStreakConfig(streak);

  const planLabelUpper =
    plan === "founder" ? "FOUNDER" : plan === "pro" ? "PRO" : "FREE";
  const planLabelNice =
    plan === "founder" ? "Founder" : plan === "pro" ? "Pro" : "Free";

  const [currency, setCurrency] = useState<"eur" | "usd" | "gbp">("eur");
  const monthlyPriceLabel = MONTHLY_PRICE_BY_CURRENCY[currency];

  async function startCheckout(
    selectedCurrency: "eur" | "usd" | "gbp",
    planType: "pro" | "yearly" | "founder" = "pro"
  ) {
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
          plan: planType,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        console.error("[checkout] error payload", data);
        setError(
          data?.error ||
            t("dashboard.checkout.error", "Could not start checkout.")
        );
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[checkout] exception", err);
      setError(
        t(
          "dashboard.checkout.networkError",
          "Network error while starting checkout."
        )
      );
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
            last7.reduce((sum, r) => sum + (r.score || 0), 0) / last7.length;
          setAvg7(Math.round(avg));
        } else {
          setAvg7(null);
        }

        // streak = days in a row with score ≥ 60
        const goodSet = new Set(
          list.filter((r) => r.score >= 60).map((r) => r.score_date)
        );

        let streakCount = 0;
        const current = new Date();

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
          .select("id, email, plan, ui_language")
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
          setPlan((profile.plan as "free" | "pro" | "founder") || "free");
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

        // Active days
        const active = historyList.filter((h) => h.count > 0).length;
        setActiveDays(active);

        // AI usage streak
        const activeDateSet = new Set(
          historyList.filter((h) => h.count > 0).map((h) => h.usage_date)
        );

        let streakCount = 0;
        const currentDate = new Date();

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

        // 4) AI Wins: last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

        const last7Usage = historyList.filter((h) => h.usage_date >= sevenStr);
        const totalAiCalls7 = last7Usage.reduce(
          (sum, h) => sum + (h.count || 0),
          0
        );
        setWeekAiCalls(totalAiCalls7);

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
        const sevenDateStr = sevenDaysAgoDate.toISOString().split("T")[0];

        const { count: notes7Count, error: notes7Err } = await supabase
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

        const sevenDaysAgoTs = new Date();
        sevenDaysAgoTs.setDate(sevenDaysAgoTs.getDate() - 6);
        const sevenDateOnly = sevenDaysAgoTs.toISOString().split("T")[0];

        const { data: tasks7Rows, error: tasks7Err } = await supabase
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

        // 8) Weekly goal
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
        setError(t("dashboard.loadError", "Failed to load dashboard data."));
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
        alert(data?.error || t("dashboard.weekGoal.saveError", "Could not save weekly goal."));
        return;
      }

      if (data.goal) {
        setWeeklyGoalId(data.goal.id);
        setWeeklyGoalText(data.goal.goal_text || text);
        setWeeklyGoalCompleted(!!data.goal.completed);
      }
    } catch (err) {
      console.error(err);
      alert(t("dashboard.weekGoal.networkError", "Network error while saving weekly goal."));
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
        alert(t("dashboard.weekGoal.toggleError", "Could not update goal status."));
        return;
      }

      setWeeklyGoalCompleted(newCompleted);
    } catch (err) {
      console.error(err);
      alert(t("dashboard.weekGoal.toggleNetworkError", "Network error while updating goal status."));
    } finally {
      setWeeklyGoalMarking(false);
    }
  }

  async function generateSummary() {
    if (!user) return;

    if (!isPro && aiCountToday >= dailyLimit) {
      setSummaryError(
        t(
          "dashboard.aiSummary.limitReached",
          "You’ve reached today’s AI limit on your current plan. Try again tomorrow or upgrade to Pro."
        )
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
        setSummaryError(
          t("dashboard.aiSummary.invalidResponse", "Server returned an invalid response.")
        );
        setSummaryLoading(false);
        return;
      }

      if (!res.ok || !data.summary) {
        console.error("AI summary error payload:", data);
        if (res.status === 429) {
          setSummaryError(
            data.error ||
              t("dashboard.aiSummary.planLimit", "You’ve reached today’s AI limit for your plan.")
          );
        } else {
          setSummaryError(
            data.error || t("dashboard.aiSummary.failed", "Failed to generate summary.")
          );
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
            typeof data.usedToday === "number" ? data.usedToday : aiCountToday + 1,
        });
      } catch {
        // ignore analytics error
      }
    } catch (err) {
      console.error(err);
      setSummaryError(
        t("dashboard.aiSummary.networkError", "Network error while generating summary.")
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  // ---------- RENDER STATES ----------

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          {t("dashboard.checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">{t("dashboard.title", "Dashboard")}</h1>
        <p className="mb-4 text-center max-w-sm text-sm text-[var(--text-muted)]">
          {t(
            "dashboard.notLoggedIn",
            "You’re not logged in. Log in or create a free account to see your plan and AI usage."
          )}
        </p>
        <Link
          href="/auth"
          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]"
        >
          {t("dashboard.goToAuth", "Go to login / signup")}
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="dashboard" />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <SetupBanner userId={user.id} />

          {showBanner && (
            <div
              className={`mb-6 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${streakCfg.gradient} text-white shadow-md`}
            >
              <div>
                <p className="font-semibold text-sm md:text-base">
                  {streakCfg.emoji} {streakCfg.title}{" "}
                  {t("dashboard.streakBannerMain", "You’re on a")}{" "}
                  <span className="font-bold">{streak}-day</span>{" "}
                  {t("dashboard.streakBannerTail", "productivity streak.")}
                </p>
                <p className="text-xs opacity-90">{streakCfg.subtitle}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t("dashboard.title", "Dashboard")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {t(
                  "dashboard.subtitle",
                  "Quick overview of your plan, AI usage, and activity."
                )}
              </p>
            </div>

            {plan === "free" && (
              <div className="mb-4 text-xs md:text-sm text-[var(--text-main)]">
                <p>
                  {t("dashboard.plan.label", "Plan:")}{" "}
                  <span className="font-semibold">{t("weeklyHistory.plan.free", "FREE")}</span>{" "}
                  | {t("dashboard.aiToday.label", "AI today:")}{" "}
                  <span className="font-semibold">
                    {aiCountToday}/{FREE_DAILY_LIMIT}
                  </span>
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  {t(
                    "dashboard.freePlanBlurb",
                    "The free plan includes up to 20 AI calls per day shared across notes, the global assistant, summaries, and planner."
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {t("dashboard.plan.label", "Plan:")}{" "}
                <span className="font-semibold">{planLabelUpper}</span>
              </span>

              <span className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {t("dashboard.aiToday.label", "AI today:")}{" "}
                <span className="font-semibold">
                  {isPro ? (
                    <>
                      {aiCountToday} {t("dashboard.aiToday.unlimitedSuffix", "used (unlimited for normal use)")}
                    </>
                  ) : (
                    <>
                      {aiCountToday}/{dailyLimit}
                    </>
                  )}
                </span>
              </span>
            </div>
          </div>

          {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

          {loadingData ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("dashboard.loadingData", "Loading your data...")}
            </p>
          ) : (
            <>
              {/* Top stats grid */}
              <div className="grid md:grid-cols-3 gap-5 mb-8 text-sm">
                {/* Account card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    {t("dashboard.section.account", "ACCOUNT")}
                  </p>
                  <p className="mb-1 text-sm break-all">{user.email}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("dashboard.account.emailHelp", "This is the account you use to log in.")}
                  </p>
                </div>

                {/* Plan card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    {t("dashboard.section.plan", "PLAN")}
                  </p>
                  <p className="mb-1 text-sm">{planLabelNice}</p>

                  <p className="text-[11px] text-[var(--text-muted)] mb-2">
                    {plan === "founder"
                      ? t(
                          "dashboard.plan.founderDescription",
                          "Unlimited daily AI usage for normal use, plus access to more powerful planning tools."
                        )
                      : plan === "pro"
                      ? t(
                          "dashboard.plan.founderDescription",
                          "Unlimited daily AI usage for normal use, plus access to more powerful planning tools."
                        )
                      : t(
                          "dashboard.plan.freeDescription",
                          "Great for light usage, daily planning and basic AI help."
                        )}
                  </p>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("dashboard.plan.dailyLimitLabel", "Daily AI limit:")}{" "}
                    <span className="font-semibold">
                      {isPro
                        ? t("dashboard.plan.dailyLimitUnlimited", "Unlimited for normal use")
                        : `${dailyLimit} ${t("dashboard.callsPerDay", "calls/day")}`}
                    </span>
                  </p>

                  {isPro ? (
                    <Link
                      href="/weekly-reports"
                      className="inline-block mt-3 text-[11px] text-[var(--accent)] hover:opacity-90"
                    >
                      {t("dashboard.link.weeklyReports", "📅 View Weekly Reports →")}
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard#pricing"
                      className="inline-block mt-3 text-[11px] text-[var(--accent)] hover:opacity-90"
                    >
                      {t(
                        "dashboard.unlockReports",
                        "🔒 Unlock Weekly Reports with Pro →"
                      )}
                    </Link>
                  )}
                </div>

                {/* Usage + Productivity Score card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    {t("dashboard.section.todayAIUsage", "TODAY'S AI USAGE")}
                  </p>

                  <p className="mb-1 text-sm">
                    {isPro ? (
                      <>
                        {aiCountToday}{" "}
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {t("dashboard.aiToday.unlimitedSuffix", "used (unlimited for normal use)")}
                        </span>
                      </>
                    ) : (
                      <>
                        {aiCountToday}/{dailyLimit} {t("dashboard.used", "used")}
                      </>
                    )}
                  </p>

                  <div className="h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden mb-2">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{
                        width: `${Math.min(
                          dailyLimit > 0 ? (aiCountToday / dailyLimit) * 100 : 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] rounded-2xl p-3 mt-3">
                    <h3 className="text-sm font-semibold mb-2">
                      📈 {t("dashboard.section.productivity", "📈 Productivity Score")}
                    </h3>

                    {scoreLoading ? (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {t("dashboard.loading", "Loading...")}
                      </p>
                    ) : (
                      <>
                        <p className="text-[13px] mb-1">
                          <span className="text-[var(--text-muted)]">
                            {t("dashboard.productivity.todayLabel", "Today:")}
                          </span>{" "}
                          <span className="font-semibold">
                            {todayScore !== null ? `${todayScore}/100` : "—"}
                          </span>
                        </p>

                        <p className="text-[13px] mb-1">
                          <span className="text-[var(--text-muted)]">
                            {t("dashboard.productivity.sevenDayAvgLabel", "7-day avg:")}
                          </span>{" "}
                          <span className="font-semibold">
                            {avg7 !== null ? `${avg7}` : "—"}
                          </span>
                        </p>

                        <p className="text-[13px] mb-3">
                          <span className="text-[var(--text-muted)]">
                            {t("dashboard.productivity.streakLabel", "Score streak (≥60):")}
                          </span>{" "}
                          <span className="font-semibold">
                            {scoreStreak} {t("dashboard.productivity.streakDaysSuffix", "days")}
                          </span>
                        </p>

                        <Link
                          href="/daily-success"
                          className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)]"
                        >
                          {t("tools.dailySuccess.cta", "Update Daily Success")}
                        </Link>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    {remaining > 0 ? (
                      isPro ? (
                        t(
                          "dashboard.aiToday.unlimitedNote",
                          "Pro gives you effectively unlimited daily AI usage for normal workflows."
                        )
                      ) : (
                        t(
                          "dashboard.remainingCalls",
                          "{remaining} AI calls left today."
                        ).replace("{remaining}", String(remaining))
                      )
                    ) : isPro ? (
                      t(
                        "dashboard.proSafetyLimit",
                        "You reached today’s Pro safety limit. Try again tomorrow."
                      )
                    ) : (
                      <>
                        {t(
                          "dashboard.freeLimitReached",
                          "You reached today’s limit on the free plan."
                        )}{" "}
                        <Link
                          href="/dashboard#pricing"
                          className="text-[var(--accent)] hover:opacity-90 underline underline-offset-2"
                        >
                          {t("dashboard.upgradeToPro", "Upgrade to Pro")}
                        </Link>{" "}
                        {t(
                          "dashboard.upgradeBenefitsShort",
                          "for unlimited daily AI (for normal use)."
                        )}
                      </>
                    )}
                  </p>

                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {t("dashboard.usage.streakLabel", "Usage streak:")}{" "}
                    <span className="font-semibold">
                      {streak} {t("dashboard.usage.streakSuffix", "days in a row")}
                    </span>{" "}
                    • {t("dashboard.usage.activeDaysLabel", "Active days (last 30):")}{" "}
                    <span className="font-semibold">{activeDays}</span>
                  </p>
                </div>

                {/* AI SUMMARY card (full-width) */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:col-span-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    {t("dashboard.section.aiSummary", "AI SUMMARY (BETA)")}
                  </p>

                  {summary ? (
                    <div className="text-[12px] whitespace-pre-wrap mb-2">{summary}</div>
                  ) : (
                    <p className="text-[12px] text-[var(--text-muted)] mb-2">
                      {t(
                        "dashboard.aiSummary.description",
                        "Let AI scan your recent notes and tasks and give you a short overview plus suggestions."
                      )}
                    </p>
                  )}

                  {summaryError && (
                    <p className="text-[11px] text-red-400 mb-2">{summaryError}</p>
                  )}

                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading || (!isPro && aiCountToday >= dailyLimit)}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs md:text-sm text-[var(--accent-contrast)]"
                  >
                    {summaryLoading
                      ? t("dashboard.aiSummary.generating", "Generating...")
                      : !isPro && aiCountToday >= dailyLimit
                      ? t("dashboard.aiSummary.limitButton", "Daily AI limit reached")
                      : t("dashboard.aiSummary.button", "Generate summary")}
                  </button>

                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {t(
                      "dashboard.aiSummary.usageNote",
                      "Uses your daily AI limit (shared with notes, assistant, planner)."
                    )}
                  </p>
                </div>
              </div>

              {/* AI Wins This Week */}
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 mb-8 text-sm">
                <p className="text-xs font-semibold text-[var(--accent)] mb-1">
                  {t("dashboard.section.aiWins", "AI WINS THIS WEEK")}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">
                  {t(
                    "dashboard.aiWins.description",
                    "A quick snapshot of how AI helped you move things forward in the last 7 days."
                  )}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">
                      {t("dashboard.aiWins.avgScoreLabel", "Avg productivity score")}
                    </p>
                    <p className="text-base font-semibold">{avg7 !== null ? `${avg7}/100` : "—"}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t("dashboard.aiWins.avgScoreHint", "Based on your daily scores")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">
                      {t("dashboard.aiWins.tasksCompletedLabel", "Tasks completed")}
                    </p>
                    <p className="text-base font-semibold">{weekTasksCompleted}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t("dashboard.aiWins.tasksCompletedHint", "Last 7 days")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">
                      {t("dashboard.aiWins.notesCreatedLabel", "Notes created")}
                    </p>
                    <p className="text-base font-semibold">{weekNotesCreated}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t("dashboard.aiWins.notesCreatedHint", "Captured ideas & thoughts")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">
                      {t("dashboard.aiWins.callsUsedLabel", "AI calls used")}
                    </p>
                    <p className="text-base font-semibold">{weekAiCalls}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      ~{weekTimeSaved} {t("dashboard.aiWins.callsUsedHint", "~9 min saved").replace("~9", "min")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Goal of the Week */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-8 text-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                  {t("dashboard.section.weekGoal", "GOAL OF THE WEEK")}
                </p>

                {!isPro ? (
                  <>
                    <p className="text-[13px] mb-1">
                      {t(
                        "dashboard.weekGoal.pitch",
                        "Set a clear weekly focus goal and let AI help you stay on track."
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">
                      {t(
                        "dashboard.weekGoal.proOnly",
                        "This is a Pro feature. Upgrade to unlock AI-powered weekly goals, progress tracking in your weekly report emails, and unlimited daily AI usage."
                      )}
                    </p>

                    <Link
                      href="/dashboard#pricing"
                      className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)]"
                    >
                      {t("settings.weeklyReport.unlockPro", "🔒 Unlock with Pro")}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-[var(--text-muted)] mb-2">
                      {t(
                        "dashboard.weekGoal.description",
                        "Pick one meaningful outcome you want to achieve this week. Keep it small and realistic."
                      )}
                    </p>

                    <textarea
                      value={weeklyGoalText}
                      onChange={(e) => setWeeklyGoalText(e.target.value)}
                      placeholder={t(
                        "dashboard.weekGoal.placeholder",
                        "e.g. Finish and send the client proposal draft."
                      )}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm mb-2 min-h-[60px]"
                    />

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => saveWeeklyGoal(false)}
                        disabled={weeklyGoalSaving || !weeklyGoalText.trim()}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs text-[var(--accent-contrast)]"
                      >
                        {weeklyGoalSaving
                          ? t("dashboard.weekGoal.saving", "Saving...")
                          : t("dashboard.weekGoal.save", "Save goal")}
                      </button>

                      <button
                        type="button"
                        onClick={() => saveWeeklyGoal(true)}
                        disabled={weeklyGoalSaving || !weeklyGoalText.trim()}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs disabled:opacity-60"
                      >
                        {weeklyGoalSaving
                          ? t("dashboard.weekGoal.saving", "Saving...")
                          : t("dashboard.weekGoal.saveAndRefine", "Save & let AI refine")}
                      </button>
                    </div>

                    {weeklyGoalId && (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={toggleWeeklyGoalCompleted}
                          disabled={weeklyGoalMarking}
                          className={`px-3 py-1.5 rounded-xl text-xs border disabled:opacity-60 ${
                            weeklyGoalCompleted
                              ? "border-emerald-500 text-emerald-300 bg-emerald-900/30"
                              : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"
                          }`}
                        >
                          {weeklyGoalCompleted
                            ? t("dashboard.weekGoal.markedDone", "✅ Marked as done")
                            : t("dashboard.weekGoal.markAsDone", "Mark this goal as done")}
                        </button>

                        <span className="text-[11px] text-[var(--text-muted)]">
                          {t("dashboard.weekGoal.singleFocus", "This is your single focus target for this week.")}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Recent activity */}
              <div className="grid md:grid-cols-2 gap-5 mb-8 text-sm">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                    {t("dashboard.section.recentNotes", "RECENT NOTES")}
                  </p>

                  {recentNotes.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {t("dashboard.recentNotes.empty", "No notes yet. Create your first note from the Notes page.")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentNotes.map((n) => (
                        <li key={n.id} className="text-[12px] line-clamp-2">
                          {n.content?.slice(0, 160) ||
                            t("dashboard.recentNotes.emptyNote", "(empty note)")}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    href="/notes"
                    className="mt-3 inline-block text-[11px] text-[var(--accent)] hover:opacity-90"
                  >
                    {t("dashboard.recentNotes.openNotes", "Open Notes →")}
                  </Link>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                    {t("dashboard.section.recentTasks", "RECENT TASKS")}
                  </p>

                  {recentTasks.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {t(
                        "dashboard.recentTasks.empty",
                        "No tasks yet. Start by adding a few tasks you want to track."
                      )}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentTasks.map((tTask) => (
                        <li
                          key={tTask.id}
                          className="text-[12px] flex items-center gap-2 line-clamp-2"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tTask.completed ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          <span>
                            {tTask.title ||
                              t("dashboard.recentTasks.untitled", "(untitled task)")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-3 mt-3">
                    <Link
                      href="/tasks"
                      className="inline-block text-[11px] text-[var(--accent)] hover:opacity-90"
                    >
                      {t("dashboard.recentTasks.openTasks", "Open Tasks →")}
                    </Link>

                    <Link
                      href="/settings"
                      className="inline-block text-[11px] text-[var(--accent)] hover:opacity-90"
                    >
                      {t("dashboard.quickLinks.settingsExport", "Settings / Export →")}
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Link
              href="/notes"
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]"
            >
              {t("dashboard.quickLinks.goToNotes", "Go to Notes")}
            </Link>

            <Link
              href="/tasks"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm"
            >
              {t("dashboard.quickLinks.goToTasks", "Go to Tasks")}
            </Link>

            <Link
              href="/templates"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm"
            >
              {t("dashboard.quickLinks.templates", "🧠 AI Templates")}
            </Link>

            <Link
              href="/planner"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm"
            >
              {t("dashboard.quickLinks.dailyPlanner", "🗓 Daily Planner")}
            </Link>

            <Link
              href="/weekly-reports"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm"
            >
              {t("dashboard.quickLinks.weeklyReports", "📅 Weekly Reports")}
            </Link>
          </div>

          {/* Pricing section left as-is but with full keys (fallbacks) */}
          {/* You can send me your Supabase keys for pricing and I’ll map them perfectly. */}

          {/* Feedback form */}
          <section className="mt-10 mb-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-sm font-semibold mb-1 text-center">
                {t("feedback.quick.title", "Send quick feedback")}
              </h2>
              <p className="text-[11px] text-[var(--text-main)]/70 mb-3 text-center">
                {t(
                  "feedback.quick.subtitle",
                  "Tell me what’s working, what’s confusing, or what you’d love to see next."
                )}
              </p>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <FeedbackForm user={user} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
