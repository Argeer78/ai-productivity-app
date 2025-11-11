"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

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

  // 1–6 days
  return {
    emoji: "🎉",
    title: "Nice streak!",
    subtitle:
      "You’re building a habit. A few more days and it becomes automatic.",
    gradient: "from-indigo-600 to-purple-600",
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro">("free");
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

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);
  const showBanner = streak >= 1;

  // 1) Load the current user
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

  // 2) Ensure profile exists & load plan + AI usage + streak + recent activity
  useEffect(() => {
    if (!user) {
      setPlan("free");
      setAiCountToday(0);
      setStreak(0);
      setActiveDays(0);
      setRecentNotes([]);
      setRecentTasks([]);
      return;
    }

    async function loadData() {
      setLoadingData(true);
      setError("");

      try {
        // profiles: plan
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, plan")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (!profile) {
          // Create default free profile if missing
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
          setPlan((inserted.plan as "free" | "pro") || "free");
        } else {
          setPlan((profile.plan as "free" | "pro") || "free");
        }

        // ai_usage: today's count
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

        // ai_usage history: last 30 days for streak + active days
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

        // Active days (last 30) = days with count > 0
        const active = historyList.filter((h) => h.count > 0).length;
        setActiveDays(active);

        // Streak = consecutive days up to today with count > 0
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

        // Recent notes
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

        // Recent tasks
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

      } catch (err: any) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [user]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setPlan("free");
      setAiCountToday(0);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  }

  // Start Stripe checkout
  async function startCheckout() {
    if (!user) return;
    setBillingLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from /api/stripe/checkout:", text);
        setError("Server returned an invalid response. Check your API route.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error payload:", data);
        setError(data.error || "Failed to start checkout.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to start checkout.");
    } finally {
      setBillingLoading(false);
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
            data.error ||
              "You’ve reached today’s AI limit for your plan."
          );
        } else {
          setSummaryError(data.error || "Failed to generate summary.");
        }
        setSummaryLoading(false);
        return;
      }

      setSummary(data.summary);
      // keep UI in sync with new usage count
      if (typeof data.usedToday === "number") {
        setAiCountToday(data.usedToday);
      } else {
        setAiCountToday((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      setSummaryError("Network error while generating summary.");
    } finally {
      setSummaryLoading(false);
    }
  }

  // Loading state
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  // Not logged in
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

  const streakCfg = getStreakConfig(streak);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="text-sm font-semibold tracking-tight">
              AI Productivity Hub
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="hidden sm:inline text-slate-300">
              Logged in as{" "}
              <span className="font-semibold">{user.email}</span>
            </span>
            <Link
              href="/settings"
              className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
            >
              Settings
            </Link>
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
          {showBanner && (
            <div
              className={`mb-6 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${streakCfg.gradient} text-white shadow-md animate-fadeIn`}
            >
              <div>
                <p className="font-semibold text-sm md:text-base">
                  {streakCfg.emoji} {streakCfg.title} You’re on a{" "}
                  <span className="font-bold">{streak}-day</span>{" "}
                  productivity streak.
                </p>
                <p className="text-xs opacity-90">{streakCfg.subtitle}</p>
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
            <p className="text-slate-300 text-sm">Loading your data...</p>
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
                </div>

                {/* Usage card */}
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
                  <p className="text-[11px] text-slate-400">
                    {remaining > 0
                      ? `${remaining} AI calls left today.`
                      : "You reached today’s limit on this plan."}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Streak:{" "}
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

              {/* Recent activity */}
              <div className="grid md:grid-cols-2 gap-5 mb-8 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    RECENT NOTES
                  </p>
                  {recentNotes.length === 0 ? (
                    <p className="text-[12px] text-slate-500">
                      No notes yet. Create your first note from the Notes page.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentNotes.map((n) => (
                        <li
                          key={n.id}
                          className="text-[12px] text-slate-200 line-clamp-2"
                        >
                          {n.content?.slice(0, 160) || "(empty note)"}
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
                              t.completed ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          <span>{t.title || "(untitled task)"}</span>
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
          </div>

          {plan === "free" && (
            <div className="rounded-2xl border border-indigo-500/60 bg-indigo-950/40 p-4 text-xs max-w-xl">
              <p className="text-indigo-100 font-semibold mb-1">
                Upgrade to Pro when you&apos;re ready
              </p>
              <p className="text-indigo-100 mb-3">
                If you hit the free AI limit often, you can upgrade your
                account securely via Stripe. You&apos;ll automatically get
                higher daily AI usage.
              </p>
              <button
                onClick={startCheckout}
                disabled={billingLoading}
                className="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-900 font-medium disabled:opacity-60"
              >
                {billingLoading ? "Opening Stripe..." : "Upgrade to Pro"}
              </button>
            </div>
          )}
        </div>
        <FeedbackForm user={user} />
      </div>
    </main>
  );
}
