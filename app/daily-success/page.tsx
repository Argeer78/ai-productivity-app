"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";

type PlanType = "free" | "pro" | "founder";

type DailyScoreRow = {
  score_date: string;
  score: number;
};

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

type Mode = "morning" | "evening" | "score" | null;

export default function DailySuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ IMPORTANT: use full keys like "dailySuccessSystem.title"
  const { t } = useT();

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [plan, setPlan] = useState<PlanType>("free");

  // ✅ Auth gate
  const gate = useAuthGate(user);

  const [morningInput, setMorningInput] = useState("");
  const [topPriorities, setTopPriorities] = useState<string[]>(["", "", ""]);
  const [eveningInput, setEveningInput] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  // Score-related state
  const [score, setScore] = useState<number>(70);
  const [savingScore, setSavingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState("");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [avgLast7, setAvgLast7] = useState<number | null>(null);
  const [scoreStreak, setScoreStreak] = useState<number>(0);

  // AI-suggested score state
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestReason, setSuggestReason] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // ✅ Mode / scroll + focus
  const mode = useMemo<Mode>(() => {
    const m = searchParams?.get("mode");
    if (m === "morning" || m === "evening" || m === "score") return m;
    return null;
  }, [searchParams]);

  const morningRef = useRef<HTMLDivElement | null>(null);
  const eveningRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);

  const morningTextRef = useRef<HTMLTextAreaElement | null>(null);
  const eveningTextRef = useRef<HTMLTextAreaElement | null>(null);

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

  // 2) Load plan (from profiles)
  useEffect(() => {
    if (!user) {
      setPlan("free");
      return;
    }

    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Daily Success: plan load error", error);
          return;
        }

        if (data?.plan === "pro" || data?.plan === "founder") {
          setPlan(data.plan as PlanType);
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadPlan();
  }, [user]);

  const isProUser = plan === "pro" || plan === "founder";

  function sendToAssistant(content: string, hint: string) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: { content, hint },
      })
    );

    setStatusMessage(
      t(
        "dailySuccessSystem.status.sentToAssistant",
        "Sent to the AI assistant. Open the assistant panel to see your result."
      )
    );
  }

  // ✅ Scroll & focus on mode
  useEffect(() => {
    if (!mode) return;

    const doScroll = () => {
      const behavior: ScrollBehavior = "smooth";
      if (mode === "morning") {
        morningRef.current?.scrollIntoView({ behavior, block: "start" });
        setTimeout(() => morningTextRef.current?.focus(), 250);
      } else if (mode === "evening") {
        eveningRef.current?.scrollIntoView({ behavior, block: "start" });
        setTimeout(() => eveningTextRef.current?.focus(), 250);
      } else if (mode === "score") {
        scoreRef.current?.scrollIntoView({ behavior, block: "start" });
      }
    };

    // wait a tick so layout is stable
    const id = window.setTimeout(doScroll, 50);
    return () => window.clearTimeout(id);
  }, [mode]);

  // 3) Morning planning handler
  function handleMorningPlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatusMessage("");

    // ✅ Gate (full page stays, action requires login)
    if (
      !gate.requireAuth(undefined, {
        title: t(
          "dailySuccessSystem.auth.morning.title",
          "Log in to generate your daily plan."
        ),
        subtitle: t(
          "dailySuccessSystem.auth.morning.subtitle",
          "Create a free account to save your progress and use the AI Daily Success System."
        ),
      })
    ) {
      return;
    }

    const trimmed = morningInput.trim();
    const priorities = topPriorities.map((p) => p.trim()).filter(Boolean);

    if (!trimmed && priorities.length === 0) {
      setError(
        t(
          "dailySuccessSystem.morning.errorEmpty",
          "Add at least one detail about your day or a priority."
        )
      );
      return;
    }

    const todayContext = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const content = `
You are an expert productivity coach.

Today is ${todayContext}.
The user wants a clear, realistic daily plan.

User's day description:
${trimmed || "(no additional description)"}

Top priorities (if any):
${priorities.length
        ? priorities.map((p, i) => `${i + 1}. ${p}`).join("\n")
        : "(not specified)"
      }

Please:
1. Create a realistic schedule from now until bedtime in blocks.
2. Highlight the top 3 must-do tasks.
3. Add 2–3 short mindset tips to avoid procrastination.
`.trim();

    const hint =
      "Create a realistic daily plan and schedule for today, focusing on priorities and procrastination-proof steps.";

    sendToAssistant(content, hint);
  }

  // 4) Evening reflection handler
  function handleEveningReflection(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatusMessage("");

    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t(
          "dailySuccessSystem.auth.evening.title",
          "Log in to reflect with AI."
        ),
        subtitle: t(
          "dailySuccessSystem.auth.evening.subtitle",
          "Create a free account to save your reflection and track your scores over time."
        ),
      })
    ) {
      return;
    }

    const trimmed = eveningInput.trim();
    if (!trimmed) {
      setError(
        t(
          "dailySuccessSystem.evening.errorEmpty",
          "Write a short reflection about how your day went."
        )
      );
      return;
    }

    const content = `
You are a supportive productivity coach.

The user is reflecting on their day. Based on their reflection, please:
1. Summarize what they actually accomplished.
2. Highlight 2–3 concrete wins.
2. Gently point out 1–2 areas to improve without shaming.
3. Suggest 3 very specific adjustments they can try tomorrow (habits, planning, or environment).

User's reflection:
${trimmed}
`.trim();

    const hint =
      "Help me reflect on my day: what I did well, what I can improve, and what to change for tomorrow.";

    sendToAssistant(content, hint);
  }

  // 5) Load score stats (today + last days)
  useEffect(() => {
    if (!user) {
      setAvgLast7(null);
      setScoreStreak(0);
      return;
    }

    async function loadScores() {
      setScoreLoading(true);
      setScoreMessage("");

      try {
        const todayStr = getTodayStr();

        const past = new Date();
        past.setDate(past.getDate() - 30);
        const pastStr = past.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("daily_scores")
          .select("score_date, score")
          .eq("user_id", user.id)
          .gte("score_date", pastStr)
          .order("score_date", { ascending: true });

        if (error && (error as any).code !== "PGRST116") {
          console.error("Daily Success: load scores error", error);
          return;
        }

        const list = (data || []) as DailyScoreRow[];
        if (!list.length) {
          setAvgLast7(null);
          setScoreStreak(0);
          return;
        }

        const todayRow = list.find((r) => r.score_date === todayStr);
        if (todayRow) setScore(todayRow.score);

        const seven = new Date();
        seven.setDate(seven.getDate() - 6);
        const sevenStr = seven.toISOString().split("T")[0];

        const last7 = list.filter((r) => r.score_date >= sevenStr);
        if (last7.length) {
          const avg =
            last7.reduce((sum, r) => sum + (r.score || 0), 0) / last7.length;
          setAvgLast7(Math.round(avg));
        } else {
          setAvgLast7(null);
        }

        const goodDateSet = new Set(
          list.filter((r) => r.score >= 60).map((r) => r.score_date)
        );

        let streakCount = 0;
        const current = new Date();
        for (let i = 0; i < 365; i++) {
          const dStr = current.toISOString().split("T")[0];
          if (goodDateSet.has(dStr)) {
            streakCount += 1;
            current.setDate(current.getDate() - 1);
          } else break;
        }
        setScoreStreak(streakCount);
      } catch (err) {
        console.error(err);
      } finally {
        setScoreLoading(false);
      }
    }

    loadScores();
  }, [user]);

  // 6) Save today's score
  async function handleSaveScore() {
    setError("");
    setScoreMessage("");

    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t(
          "dailySuccessSystem.auth.saveScore.title",
          "Log in to save your daily score."
        ),
        subtitle: t(
          "dailySuccessSystem.auth.saveScore.subtitle",
          "Create a free account to track your averages and streak."
        ),
      })
    ) {
      return;
    }
    if (!user) return;

    setSavingScore(true);

    try {
      const todayStr = getTodayStr();

      const { error } = await supabase.from("daily_scores").upsert(
        {
          user_id: user.id,
          score_date: todayStr,
          score,
          note: eveningInput.trim() || null,
        },
        { onConflict: "user_id,score_date" }
      );

      if (error) {
        console.error("Daily Success: save score error", error);
        setError(
          t(
            "dailySuccessSystem.score.saveError",
            "Failed to save your daily score."
          )
        );
        return;
      }

      setScoreMessage(
        t(
          "dailySuccessSystem.score.savedMessage",
          "Saved! Your streak and averages are updated."
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        t(
          "dailySuccessSystem.score.saveError",
          "Failed to save your daily score."
        )
      );
    } finally {
      setSavingScore(false);
    }
  }

  // 7) Ask AI to suggest today's score
  async function handleSuggestScore() {
    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t(
          "dailySuccessSystem.auth.suggestScore.title",
          "Log in to let AI suggest your score."
        ),
        subtitle: t(
          "dailySuccessSystem.auth.suggestScore.subtitle",
          "AI uses your saved activity to estimate a realistic score."
        ),
      })
    ) {
      return;
    }
    if (!user) return;

    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestReason(null);

    try {
      const res = await fetch("/api/daily-score/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json().catch(() => null);

      // ✅ AI limit handling (route now enforces shared daily usage)
      if (res.status === 429) {
        setSuggestError(
          data?.error ||
          t(
            "dailySuccessSystem.suggest.rateLimit",
            "You’ve reached today’s AI limit. Try again tomorrow or upgrade to Pro."
          )
        );
        return;
      }

      if (!res.ok || !data?.ok) {
        setSuggestError(
          data?.error ||
          t(
            "dailySuccessSystem.suggest.errorGeneric",
            "Could not get an AI suggestion."
          )
        );
        return;
      }

      if (typeof data.score === "number") setScore(data.score);
      if (typeof data.reason === "string") setSuggestReason(data.reason);
    } catch (err) {
      console.error("[daily-success] suggest error", err);
      setSuggestError(
        t(
          "dailySuccessSystem.suggest.networkError",
          "Network error while asking AI to suggest your score."
        )
      );
    } finally {
      setSuggestLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          {t("dailySuccessSystem.loadingSystem", "Loading your daily system…")}
        </p>
      </main>
    );
  }

  const priorityLabelByIdx = (idx: number) => {
    if (idx === 0)
      return t("dailySuccessSystem.morning.priority1", "Priority #1");
    if (idx === 1)
      return t("dailySuccessSystem.morning.priority2", "Priority #2");
    return t("dailySuccessSystem.morning.priority3", "Priority #3");
  };

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="daily-success" />

      {/* ✅ Auth modal */}
      <AuthGateModal
        open={gate.open}
        onClose={gate.close}
        copy={gate.copy}
        authHref={gate.authHref}
      />

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t(
                  "dailySuccessSystem.title",
                  "AI Daily Success System"
                )}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {t(
                  "dailySuccessSystem.subtitle",
                  "Start your day with a focused plan, end it with a clear reflection, and track your progress with a simple score."
                )}
              </p>

              {!user && (
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {t(
                    "dailySuccessSystem.auth.inline",
                    "You're viewing as a guest. Log in to generate plans, reflect with AI, and save your score."
                  )}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      gate.openGate({
                        title: t(
                          "dailySuccessSystem.auth.title",
                          "Log in to use the Daily Success System."
                        ),
                      })
                    }
                    className="underline underline-offset-2 text-[var(--accent)] hover:opacity-90"
                  >
                    {t(
                      "dailySuccessSystem.auth.cta",
                      "Go to login / signup"
                    )}
                  </button>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ Quick deep-links for Action Hub */}
              <Link
                href="/daily-success?mode=morning"
                className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
              >
                {t("dailySuccessSystem.quick.morning", "Morning")}
              </Link>
              <Link
                href="/daily-success?mode=evening"
                className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
              >
                {t("dailySuccessSystem.quick.evening", "Evening")}
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
              >
                {t(
                  "dailySuccessSystem.backToDashboard",
                  "← Back to dashboard"
                )}
              </Link>
            </div>
          </div>

          {/* Guest Banner */}
          {!user && (
            <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
              <div className="flex-1 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
                  AI SUCCESS SYSTEM
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
                  Achieve more, stress less 🚀
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md leading-relaxed">
                  Start your day with intention and end with reflection. Track your daily success score and build a winning streak.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => gate.openGate()}
                    className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-green-500/20"
                  >
                    Start your streak
                  </button>
                </div>
              </div>
              <div className="w-full max-w-xs relative z-10">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] bg-white">
                  <img src="/images/history-welcome.png?v=1" alt="Success" className="w-full h-auto" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>
          )}

          {!isProUser && (
            <div className="mb-5 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[11px] text-[var(--text-main)]">
              <p className="font-semibold mb-1">
                {t(
                  "dailySuccessSystem.freePlan.label",
                  "You're on the Free plan."
                )}
              </p>
              <p className="mb-2 text-[var(--text-muted)]">
                {t(
                  "dailySuccessSystem.freePlan.body",
                  "The Daily Success System works great on Free, but Pro will unlock higher AI usage and future automation (auto-generated plans, weekly reports, and more)."
                )}
              </p>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-[11px]"
              >
                {t(
                  "dailySuccessSystem.freePlan.viewPro",
                  "View Pro options"
                )}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {statusMessage && (
            <p className="text-xs text-emerald-400 mb-3">
              {statusMessage}
            </p>
          )}

          {/* Score stats card */}
          <div className="mb-5 grid md:grid-cols-3 gap-3 text-[11px]">
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                {t(
                  "dailySuccessSystem.todaysScore.heading",
                  "Today's score"
                )}
              </p>
              <p className="text-xl font-semibold">
                {score}
                <span className="text-[11px] text-[var(--text-muted)] ml-1">
                  /100
                </span>
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {t(
                  "dailySuccessSystem.todaysScore.help",
                  "0 = terrible day, 100 = perfect day. Be honest, not harsh."
                )}
              </p>
            </div>

            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                {t("dailySuccessSystem.avg7d.label", "Avg last 7 days")}
              </p>
              <p className="text-xl font-semibold">
                {avgLast7 !== null ? `${avgLast7}/100` : "—"}
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {t(
                  "dailySuccessSystem.avg7d.help",
                  "Aim for consistency, not perfection."
                )}
              </p>
            </div>

            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                {t(
                  "dailySuccessSystem.streak.label",
                  "Success streak (score ≥ 60)"
                )}
              </p>
              <p className="text-xl font-semibold">
                {scoreStreak}{" "}
                {t(
                  scoreStreak === 1
                    ? "dailySuccessSystem.streak.day"
                    : "dailySuccessSystem.streak.days",
                  scoreStreak === 1 ? "day" : "days"
                )}
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {t(
                  "dailySuccessSystem.streak.help",
                  "Days in a row you rated your day 60+."
                )}
              </p>
            </div>
          </div>

          {scoreLoading && (
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              {t(
                "dailySuccessSystem.score.loadingRecent",
                "Loading your recent scores…"
              )}
            </p>
          )}
          {scoreMessage && (
            <p className="text-[11px] text-emerald-400 mb-3">
              {scoreMessage}
            </p>
          )}

          {/* Main grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Morning */}
            <section
              ref={morningRef}
              className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4"
            >
              <h2 className="text-sm font-semibold mb-2">
                {t(
                  "dailySuccessSystem.morning.title",
                  "🌅 Morning: Design your day"
                )}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {t(
                  "dailySuccessSystem.morning.description",
                  "Tell the AI what's on your plate, and it will build a realistic schedule with priorities."
                )}
              </p>

              <form onSubmit={handleMorningPlan} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t(
                      "dailySuccessSystem.morning.questionToday",
                      "What's happening today?"
                    )}
                  </label>
                  <textarea
                    ref={morningTextRef}
                    value={morningInput}
                    onChange={(e) => setMorningInput(e.target.value)}
                    placeholder={t(
                      "dailySuccessSystem.morning.questionToday.placeholder",
                      "Meetings, deadlines, personal tasks, energy level, etc."
                    )}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t(
                      "dailySuccessSystem.morning.top3.label",
                      "Top 3 priorities"
                    )}
                  </label>

                  <div className="space-y-1.5">
                    {topPriorities.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const next = [...topPriorities];
                          next[idx] = e.target.value;
                          setTopPriorities(next);
                        }}
                        placeholder={priorityLabelByIdx(idx)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    ))}
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {t(
                      "dailySuccessSystem.morning.prioritiesHelp",
                      "You don't have to fill all three, but at least one priority helps a lot."
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-xs"
                >
                  {t(
                    "dailySuccessSystem.morning.generateButton",
                    "✨ Generate today's AI plan"
                  )}
                </button>
              </form>
            </section>

            {/* Evening */}
            <section
              ref={eveningRef}
              className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4"
            >
              <h2 className="text-sm font-semibold mb-2">
                {t(
                  "dailySuccessSystem.evening.title",
                  "🌙 Evening: Reflect & score your day"
                )}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {t(
                  "dailySuccessSystem.evening.description",
                  "Capture how your day went. The AI will turn it into wins, lessons, and improvements for tomorrow."
                )}
              </p>

              <form onSubmit={handleEveningReflection} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t(
                      "dailySuccessSystem.evening.questionDay",
                      "How did today actually go?"
                    )}
                  </label>
                  <textarea
                    ref={eveningTextRef}
                    value={eveningInput}
                    onChange={(e) => setEveningInput(e.target.value)}
                    placeholder={t(
                      "dailySuccessSystem.evening.questionDay.placeholder",
                      "What you got done, what derailed you, your energy, distractions, etc."
                    )}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[100px]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs"
                >
                  {t(
                    "dailySuccessSystem.evening.reflectButton",
                    "💭 Reflect with AI"
                  )}
                </button>
              </form>

              {/* Score slider + AI suggest */}
              <div
                ref={scoreRef}
                className="mt-5 border-t border-[var(--border-subtle)] pt-3"
              >
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t(
                    "dailySuccessSystem.evening.scoreQuestion",
                    "How would you rate today overall?"
                  )}
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-10 text-right">
                    {score}
                  </span>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {t(
                    "dailySuccessSystem.evening.scoreHelp",
                    "Think about effort + focus, not just outcomes. A 60–80 day is often a win."
                  )}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSuggestScore}
                    disabled={suggestLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-[11px]"
                  >
                    {suggestLoading
                      ? t(
                        "dailySuccessSystem.evening.aiSuggestLoading",
                        "Asking AI…"
                      )
                      : t(
                        "dailySuccessSystem.evening.aiSuggestLabel",
                        "Let AI suggest today's score"
                      )}
                  </button>

                  <p className="text-[10px] text-[var(--text-muted)]">
                    {t(
                      "dailySuccessSystem.evening.aiSuggestHelp",
                      "AI looks at your tasks & notes to guess a realistic score. You can still adjust it."
                    )}
                  </p>
                </div>

                {suggestReason && (
                  <p className="mt-2 text-[11px] text-[var(--text-main)]">
                    {t(
                      "dailySuccessSystem.evening.aiSuggestReasonPrefix",
                      "Suggested because:"
                    )}{" "}
                    {suggestReason}
                  </p>
                )}

                {suggestError && (
                  <p className="mt-2 text-[11px] text-red-400">
                    {suggestError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSaveScore}
                  disabled={savingScore}
                  className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-xs"
                >
                  {savingScore
                    ? t(
                      "dailySuccessSystem.evening.saveScoreSaving",
                      "Saving..."
                    )
                    : t(
                      "dailySuccessSystem.evening.saveScoreButton",
                      "Save today's score"
                    )}
                </button>
              </div>

              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-[11px] text-[var(--text-muted)] mb-1">
                  {t(
                    "dailySuccessSystem.hint.title",
                    "Hint for best results:"
                  )}
                </p>
                <ul className="text-[11px] text-[var(--text-muted)] list-disc list-inside space-y-1">
                  <li>
                    {t(
                      "dailySuccessSystem.hint.tip1",
                      "Mention 2–3 things you're proud of."
                    )}
                  </li>
                  <li>
                    {t(
                      "dailySuccessSystem.hint.tip2",
                      "Be honest about distractions and procrastination."
                    )}
                  </li>
                  <li>
                    {t(
                      "dailySuccessSystem.hint.tip3",
                      "Add how you'd like tomorrow to feel."
                    )}
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <p className="mt-6 text-[11px] text-[var(--text-muted)]">
            {t(
              "dailySuccessSystem.hint.privacy",
              "Your answers and scores are processed by the AI assistant. You can always fine-tune the output directly in the assistant panel."
            )}
          </p>
        </div>
      </div>
    </main >
  );
}
