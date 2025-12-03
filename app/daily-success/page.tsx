// app/daily-success/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type PlanType = "free" | "pro" | "founder";

type DailyScoreRow = {
  score_date: string;
  score: number;
};

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function DailySuccessPage() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [plan, setPlan] = useState<PlanType>("free");

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
  const [scoreStreak, setScoreStreak] = useState<number>(0); // consecutive "good" days (score >= 60)

  // AI-suggested score state
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestReason, setSuggestReason] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

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
        detail: {
          content,
          hint,
        },
      })
    );

    setStatusMessage(
      "Sent to the AI assistant. Open the assistant panel to see your result."
    );
  }

  // 3) Morning planning handler
  function handleMorningPlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatusMessage("");

    const trimmed = morningInput.trim();
    const priorities = topPriorities.map((p) => p.trim()).filter(Boolean);

    if (!trimmed && priorities.length === 0) {
      setError("Add at least one detail about your day or a priority.");
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
${
  priorities.length
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

    const trimmed = eveningInput.trim();
    if (!trimmed) {
      setError("Write a short reflection about how your day went.");
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
    if (!user) return;

    async function loadScores() {
      setScoreLoading(true);
      setScoreMessage("");

      try {
        const todayStr = getTodayStr();

        // Pull last 30 days of scores to compute averages & streaks
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

        // Today's score (if exists)
        const todayRow = list.find((r) => r.score_date === todayStr);
        if (todayRow) {
          setScore(todayRow.score);
        }

        // Average last 7 days
        const seven = new Date();
        seven.setDate(seven.getDate() - 6); // last 7 calendar days
        const sevenStr = seven.toISOString().split("T")[0];

        const last7 = list.filter((r) => r.score_date >= sevenStr);
        if (last7.length) {
          const avg =
            last7.reduce((sum, r) => sum + (r.score || 0), 0) /
            last7.length;
          setAvgLast7(Math.round(avg));
        } else {
          setAvgLast7(null);
        }

        // Score-based streak: days in a row with score >= 60
        const goodDateSet = new Set(
          list
            .filter((r) => r.score >= 60)
            .map((r) => r.score_date)
        );

        let streakCount = 0;
        let current = new Date();
        for (let i = 0; i < 365; i++) {
          const dStr = current.toISOString().split("T")[0];
          if (goodDateSet.has(dStr)) {
            streakCount += 1;
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

    loadScores();
  }, [user]);

  // 6) Save today's score
  async function handleSaveScore() {
    if (!user) {
      setScoreMessage("Log in to save your daily score.");
      return;
    }

    setSavingScore(true);
    setScoreMessage("");
    setError("");

    try {
      const todayStr = getTodayStr();

      const { error } = await supabase
        .from("daily_scores")
        .upsert(
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
        setError("Failed to save your daily score.");
        return;
      }

      setScoreMessage("Saved! Your streak and averages are updated.");
    } catch (err) {
      console.error(err);
      setError("Failed to save your daily score.");
    } finally {
      setSavingScore(false);
    }
  }

  // 7) Ask AI to suggest today's score
  async function handleSuggestScore() {
    if (!user) {
      setSuggestError("Log in to let AI suggest a score.");
      return;
    }

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

      if (!res.ok || !data?.ok) {
        setSuggestError(data?.error || "Could not get an AI suggestion.");
        return;
      }

      if (typeof data.score === "number") {
        setScore(data.score);
      }
      if (typeof data.reason === "string") {
        setSuggestReason(data.reason);
      }
    } catch (err) {
      console.error("[daily-success] suggest error", err);
      setSuggestError(
        "Network error while asking AI to suggest your score."
      );
    } finally {
      setSuggestLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Loading your daily system…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="daily-success" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                AI Daily Success System
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Start your day with a focused plan, end it with a clear
                reflection, and track your progress with a simple score.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
            >
              ← Back to dashboard
            </Link>
          </div>

          {!isProUser && (
            <div className="mb-5 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[11px] text-[var(--text-main)]">
    <p className="font-semibold mb-1">
      You're on the Free plan.
    </p>
    <p className="mb-2 text-[var(--text-muted)]">
      The Daily Success System works great on Free, but{" "}
      <span className="font-semibold text-[var(--text-main)]">
        Pro will unlock higher AI usage and future automation
      </span>{" "}
      (auto-generated plans, weekly reports, and more).
    </p>
    <button
      type="button"
      onClick={() => router.push("/dashboard#pricing")}
      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-[11px]"
    >
      View Pro options
    </button>
  </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          {statusMessage && (
            <p className="text-xs text-emerald-400 mb-3">
              {statusMessage}
            </p>
          )}

          {/* Score stats card */}
          <div className="mb-5 grid md:grid-cols-3 gap-3 text-[11px]">
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                Today's score
              </p>
              <p className="text-xl font-semibold">
                {score}
                <span className="text-[11px] text-[var(--text-muted)] ml-1">
                  /100
                </span>
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                0 = terrible day, 100 = perfect day. Be honest, not harsh.
              </p>
            </div>
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                Avg last 7 days
              </p>
              <p className="text-xl font-semibold">
                {avgLast7 !== null ? `${avgLast7}/100` : "—"}
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                Aim for consistency, not perfection.
              </p>
            </div>
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                Success streak (score ≥ 60)
              </p>
              <p className="text-xl font-semibold">
                {scoreStreak} day{scoreStreak === 1 ? "" : "s"}
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                Days in a row you rated your day 60+.
              </p>
            </div>
          </div>

          {scoreLoading && (
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              Loading your recent scores…
            </p>
          )}
          {scoreMessage && (
            <p className="text-[11px] text-emerald-400 mb-3">
              {scoreMessage}
            </p>
          )}

          {/* Main grid: Morning / Evening + Score */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Morning planning */}
            <section className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2">
                🌅 Morning: Design your day
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Tell the AI what's on your plate, and it will build a
                realistic schedule with priorities.
              </p>

              <form onSubmit={handleMorningPlan} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    What's happening today?
                  </label>
                  <textarea
                    value={morningInput}
                    onChange={(e) => setMorningInput(e.target.value)}
                    placeholder="Meetings, deadlines, personal tasks, energy level, etc."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Top 3 priorities
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
                        placeholder={`Priority #${idx + 1}`}
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    You don't have to fill all three, but at least one
                    priority helps a lot.
                  </p>
                </div>

                <button
                  type="submit"
                  className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-xs"
                >
                  ✨ Generate today's AI plan
                </button>
              </form>
            </section>

            {/* Evening reflection + score */}
            <section className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2">
                🌙 Evening: Reflect & score your day
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Capture how your day went. The AI will turn it into wins,
                lessons, and improvements for tomorrow.
              </p>

              <form onSubmit={handleEveningReflection} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    How did today actually go?
                  </label>
                  <textarea
                    value={eveningInput}
                    onChange={(e) => setEveningInput(e.target.value)}
                    placeholder="What you got done, what derailed you, your energy, distractions, etc."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[100px]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs"
                >
                  💭 Reflect with AI
                </button>
              </form>

              {/* Score slider + AI suggest */}
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-3">
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  How would you rate today overall?
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
                  Think about effort + focus, not just outcomes. A 60–80 day
                  is often a win.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSuggestScore}
                    disabled={suggestLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-[11px]"
                  >
                    {suggestLoading
                      ? "Asking AI…"
                      : "Let AI suggest today's score"}
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    AI looks at your tasks & notes to guess a realistic score.
                    You can still adjust it.
                  </p>
                </div>

                {suggestReason && (
                  <p className="mt-2 text-[11px] text-[var(--text-main)]">
                    Suggested because: {suggestReason}
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
                  {savingScore ? "Saving..." : "Save today's score"}
                </button>
              </div>

              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-[11px] text-[var(--text-muted)] mb-1">
                  Hint for best results:
                </p>
                <ul className="text-[11px] text-[var(--text-muted)] list-disc list-inside space-y-1">
                  <li>Mention 2–3 things you're proud of.</li>
                  <li>Be honest about distractions and procrastination.</li>
                  <li>Add how you'd like tomorrow to feel.</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Small footer hint */}
          <p className="mt-6 text-[11px] text-[var(--text-muted)]">
            Your answers and scores are processed by the AI assistant. You
            can always fine-tune the output directly in the assistant panel.
          </p>
        </div>
      </div>
    </main>
  );
}
