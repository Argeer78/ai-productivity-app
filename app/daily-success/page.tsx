"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import Confetti from "@/app/components/Confetti";
import Alive3DImage from "@/app/components/Alive3DImage";
import { useSound } from "@/lib/sound";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";

type PlanType = "free" | "pro" | "founder";

import BioRhythmChart from "@/app/components/BioRhythmChart";

type DailyScoreRow = {
  score_date: string;
  score: number;
  energy_level: number | null;
};

// ... inside component ...



function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

type Mode = "morning" | "evening" | "score" | null;

// ✅ Pretty plain-text section renderer (NO markdown required)
function renderLabeledSections(text: string) {
  const raw = (text || "").trim();
  if (!raw) return null;

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const sections: { title: string; items: string[] }[] = [];
  let currentTitle = "";
  let currentItems: string[] = [];

  const push = () => {
    if (!currentTitle && currentItems.length === 0) return;
    sections.push({
      title: currentTitle || "Notes",
      items: currentItems.length ? currentItems : ["(no items)"],
    });
    currentTitle = "";
    currentItems = [];
  };

  for (const line of lines) {
    const isHeading = /^[A-Z][A-Z\s]{2,}:$/.test(line); // e.g. "WINS:"
    if (isHeading) {
      push();
      currentTitle = line.replace(/:$/, "");
      continue;
    }

    const cleaned = line.replace(/^[-•]\s*/, "");
    currentItems.push(cleaned);
  }

  push();

  return (
    <div className="space-y-3">
      {sections.map((s, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
        >
          <p className="text-[11px] font-semibold text-[var(--text-main)] mb-2">
            {s.title}
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--text-main)]">
            {s.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function DailySuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ IMPORTANT: use full keys like "dailySuccessSystem.title"
  const { t, uiLang } = useT();
  const { play } = useSound();

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

  // ✅ NEW: Daily plan result (morning)
  const [morningLoading, setMorningLoading] = useState(false);
  const [morningPlan, setMorningPlan] = useState<string | null>(null);
  const [morningPlanError, setMorningPlanError] = useState<string | null>(null);

  // ✅ NEW: Evening reflection result (evening)
  const [eveningLoading, setEveningLoading] = useState(false);
  const [eveningResult, setEveningResult] = useState<string | null>(null);
  const [eveningResultError, setEveningResultError] = useState<string | null>(null);

  // ✅ Confetti state (top level)
  const [showConfetti, setShowConfetti] = useState(false);

  // ✅ Chart Data
  const [chartData, setChartData] = useState<DailyScoreRow[]>([]);

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

    const id = window.setTimeout(doScroll, 50);
    return () => window.clearTimeout(id);
  }, [mode]);

  // ✅ NEW: Morning planning handler (loads answer like daily planner does)
  async function handleMorningPlan(e: React.FormEvent) {
    e.preventDefault();
    play("pop"); // Added play('pop')
    setError("");
    setStatusMessage("");
    setMorningPlanError(null);

    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t("dailySuccessSystem.auth.morning.title", "Log in to generate your daily plan."),
        subtitle: t(
          "dailySuccessSystem.auth.morning.subtitle",
          "Create a free account to save your progress and use the AI Daily Success System."
        ),
      })
    ) {
      return;
    }
    if (!user) return;

    const trimmed = morningInput.trim();
    const priorities = topPriorities.map((p) => p.trim()).filter(Boolean);

    if (!trimmed && priorities.length === 0) {
      setError(
        t("dailySuccessSystem.morning.errorEmpty", "Add at least one detail about your day or a priority.")
      );
      return;
    }

    setMorningLoading(true);
    setMorningPlan(null);

    try {
      // ✅ You should create this route (same style as evening route I gave you)
      // POST /api/daily-success/morning  { userId, dayDescription, priorities }
      const res = await fetch("/api/daily-success/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          dayDescription: trimmed,
          priorities,
          lang: uiLang,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 429) {
        setMorningPlanError(
          data?.error ||
          t(
            "dailySuccessSystem.suggest.rateLimit",
            "You’ve reached today’s AI limit. Try again tomorrow or upgrade to Pro."
          )
        );
        return;
      }

      if (!res.ok || !data?.ok) {
        setMorningPlanError(
          data?.error ||
          t(
            "dailySuccessSystem.morning.errorGeneric",
            "Could not generate a plan. Please try again."
          )
        );
        return;
      }

      const text = (data?.plan || data?.text || "").trim();
      if (!text) {
        setMorningPlanError(
          t("dailySuccessSystem.morning.errorEmptyPlan", "AI returned an empty plan. Try again.")
        );
        return;
      }

      setMorningPlan(text);
    } catch (err: any) {
      console.error("[daily-success] morning error", err);
      setMorningPlanError(
        t(
          "dailySuccessSystem.morning.networkError",
          "Network error while generating your plan."
        )
      );
    } finally {
      setMorningLoading(false);
    }
  }

  // ✅ NEW: Evening reflection handler (loads answer from route, NOT assistant chat)
  async function handleEveningReflection(e: React.FormEvent) {
    e.preventDefault();
    play("pop"); // Added play('pop')
    setError("");
    setStatusMessage("");
    setEveningResultError(null);

    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t("dailySuccessSystem.auth.evening.title", "Log in to reflect with AI."),
        subtitle: t(
          "dailySuccessSystem.auth.evening.subtitle",
          "Create a free account to save your reflection and track your scores over time."
        ),
      })
    ) {
      return;
    }
    if (!user) return;

    const trimmed = eveningInput.trim();
    if (!trimmed) {
      setError(t("dailySuccessSystem.evening.errorEmpty", "Write a short reflection about how your day went."));
      return;
    }

    setEveningLoading(true);
    setEveningResult(null);

    try {
      // ✅ Uses the evening route I gave you:
      // POST /api/daily-success/evening { userId, reflection }
      const res = await fetch("/api/daily-success/evening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          reflection: trimmed,
          lang: uiLang,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 429) {
        setEveningResultError(
          data?.error ||
          t(
            "dailySuccessSystem.suggest.rateLimit",
            "You’ve reached today’s AI limit. Try again tomorrow or upgrade to Pro."
          )
        );
        return;
      }

      if (!res.ok || !data?.ok) {
        setEveningResultError(
          data?.error ||
          t(
            "dailySuccessSystem.evening.errorGeneric",
            "Could not generate an evening reflection. Please try again."
          )
        );
        return;
      }

      const text = (data?.reflection || "").trim();
      if (!text) {
        setEveningResultError(
          t("dailySuccessSystem.evening.errorEmptyAi", "AI returned an empty reflection. Try again.")
        );
        return;
      }

      setEveningResult(text);
    } catch (err: any) {
      console.error("[daily-success] evening error", err);
      setEveningResultError(
        t(
          "dailySuccessSystem.evening.networkError",
          "Network error while reflecting with AI."
        )
      );
    } finally {
      setEveningLoading(false);
    }
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
          .select("score_date, score, energy_level")
          .eq("user_id", user.id)
          .gte("score_date", pastStr)
          .order("score_date", { ascending: true });

        if (error && (error as any).code !== "PGRST116") {
          console.error("Daily Success: load scores error", error);
          return;
        }

        const list = (data || []) as DailyScoreRow[];
        setChartData(list); // ✅ Save for chart

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
          const avg = last7.reduce((sum, r) => sum + (r.score || 0), 0) / last7.length;
          setAvgLast7(Math.round(avg));
        } else {
          setAvgLast7(null);
        }

        const goodDateSet = new Set(list.filter((r) => r.score >= 60).map((r) => r.score_date));

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

  // ✅ Energy Level logic
  const [energyLevel, setEnergyLevel] = useState<number>(5);

  // Load energy level if available
  useEffect(() => {
    if (chartData.length > 0) {
      const todayStr = getTodayStr();
      const todayRow = chartData.find(r => r.score_date === todayStr);
      if (todayRow && todayRow.energy_level !== null) {
        setEnergyLevel(todayRow.energy_level);
      }
    }
  }, [chartData]);


  // 6) Save today's score
  async function handleSaveScore() {
    setError("");
    setScoreMessage("");

    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t("dailySuccessSystem.auth.saveScore.title", "Log in to save your daily score."),
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

      // Also save to localStorage for FocusMate
      localStorage.setItem(`energy_${todayStr}`, String(energyLevel));

      const { error } = await supabase.from("daily_scores").upsert(
        {
          user_id: user.id,
          score_date: todayStr,
          score,
          energy_level: energyLevel, // ✅ Added energy level
          note: eveningInput.trim() || null,
        },
        { onConflict: "user_id,score_date" }
      );

      if (error) {
        console.error("Daily Success: save score error", error);
        setError(t("dailySuccessSystem.score.saveError", "Failed to save your daily score."));
        return;
      }

      setScoreMessage(t("dailySuccessSystem.score.savedMessage", "Saved! Your streak and averages are updated."));
      if (score >= 60) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(t("dailySuccessSystem.score.saveError", "Failed to save your daily score."));
    } finally {
      setSavingScore(false);
    }
  }

  // 7) Ask AI to suggest today's score
  async function handleSuggestScore() {
    play("pop"); // Added play('pop')
    // ✅ Gate
    if (
      !gate.requireAuth(undefined, {
        title: t("dailySuccessSystem.auth.suggestScore.title", "Log in to let AI suggest your score."),
        subtitle: t("dailySuccessSystem.auth.suggestScore.subtitle", "AI uses your saved activity to estimate a realistic score."),
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
          t("dailySuccessSystem.suggest.errorGeneric", "Could not get an AI suggestion.")
        );
        return;
      }

      if (typeof data.score === "number") setScore(data.score);
      if (typeof data.reason === "string") setSuggestReason(data.reason);
    } catch (err) {
      console.error("[daily-success] suggest error", err);
      setSuggestError(t("dailySuccessSystem.suggest.networkError", "Network error while asking AI to suggest your score."));
    } finally {
      setSuggestLoading(false);
    }
  }

  // ✅ NEW: Generate tasks from any text (Morning plan or Evening reflection)
  const [generatingTasksSource, setGeneratingTasksSource] = useState<"morning" | "evening" | null>(null);

  async function handleGenerateTasks(content: string | null, source: "morning" | "evening") {
    if (!content?.trim()) return;
    play("pop");

    if (!gate.requireAuth(undefined, {
      title: t("dailySuccessSystem.auth.tasks.title", "Log in to create tasks."),
      subtitle: t("dailySuccessSystem.auth.tasks.subtitle", "Turn your plan into actionable to-dos automatically.")
    })) return;

    if (!user) return;

    setGeneratingTasksSource(source);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Reuse the same API as Notes page
        body: JSON.stringify({ content }),
      });

      // Simple helper to read JSON safely
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("[generate-tasks] error:", data);
        alert(data?.error || t("dailySuccessSystem.tasks.error", "Failed to generate tasks."));
        return;
      }

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length === 0) {
        alert(t("dailySuccessSystem.tasks.empty", "AI couldn't find any specific tasks in this text."));
        return;
      }

      const rows = tasks.map((tItem: any) => ({
        user_id: user.id,
        title: typeof tItem.title === "string" ? tItem.title.trim() : "",
        completed: false,
        // Optional: you could try to guess category or leave null
        category: null
      })).filter((r: any) => r.title.length > 0);

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        console.error("[generate-tasks] insert error:", insertError);
        alert(t("dailySuccessSystem.tasks.saveError", "Failed to save tasks."));
        return;
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      // Optional: Redirect to tasks or just show success
      if (confirm(t("dailySuccessSystem.tasks.success", `Created ${rows.length} tasks! Go to Tasks page?`))) {
        router.push("/tasks");
      }

    } catch (err: any) {
      console.error("[generate-tasks] unexpected:", err);
      alert(t("dailySuccessSystem.tasks.networkError", "Unexpected error."));
    } finally {
      setGeneratingTasksSource(null);
    }
  }

  // ✅ Voice Handling
  function handleMorningVoice(payload: { rawText: string | null; structured: any | null }) {
    if (payload.rawText || payload.structured?.note) {
      // Prefer structured note/summary for planning, or fallback to raw
      const text = payload.structured?.note || payload.structured?.summary || payload.rawText;
      const combined = morningInput ? morningInput + "\n\n" + text : text;

      setMorningInput(combined);
      play("success");

      // ✅ Extract priorities from voice
      const tasks = (payload.structured?.tasks || []).map((t: any) => t.title);
      const actions = (payload.structured?.actions || []);
      const candidates = [...tasks, ...actions].filter((s: string) => s && s.trim().length > 0);

      if (candidates.length > 0) {
        setTopPriorities([
          candidates[0] || "",
          candidates[1] || "",
          candidates[2] || ""
        ]);
      }
    }
  }

  function handleVoiceReflection(payload: { rawText: string | null; structured: any | null }) {
    if (payload.rawText) {
      // If we got a structured reflection, prefer that + the note, otherwise just raw text
      const reflection = payload.structured?.reflection || payload.structured?.note || payload.rawText;
      const combined = eveningInput ? eveningInput + "\n\n" + reflection : reflection;

      setEveningInput(combined);
      play("success"); // Feedback sound
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
    if (idx === 0) return t("dailySuccessSystem.morning.priority1", "Priority #1");
    if (idx === 1) return t("dailySuccessSystem.morning.priority2", "Priority #2");
    return t("dailySuccessSystem.morning.priority3", "Priority #3");
  };



  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      {showConfetti && <Confetti />}
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
          <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {t("dailySuccessSystem.title", "AI Daily Success System")}
              </h1>
              <p className="text-sm text-[var(--text-muted)] max-w-lg leading-relaxed mb-4 mx-auto md:mx-0">
                {t(
                  "dailySuccessSystem.subtitle",
                  "Start your day with a focused plan, end it with a clear reflection, and track your progress with a simple score."
                )}
              </p>

              {!user && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[11px] text-[var(--text-muted)]">
                  <span>
                    {t(
                      "dailySuccessSystem.auth.inline",
                      "You're viewing as a guest. Log in to save your history."
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      gate.openGate({
                        title: t("dailySuccessSystem.auth.title", "Log in to use the Daily Success System."),
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-transform font-medium"
                  >
                    {t("dailySuccessSystem.auth.cta", "Go to login / signup")}
                  </button>
                </div>
              )}
            </div>

            {/* 3D Illustration */}
            <div className="shrink-0 w-[200px] h-[200px] md:w-[240px] md:h-[240px] relative pointer-events-none">
              <Alive3DImage src="/images/success-hero.png" alt="Daily Success" className="relative z-10 w-full h-full object-contain" />
            </div>
          </div>


          <div className="flex items-center gap-2">
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
              {t("dailySuccessSystem.backToDashboard", "← Back to dashboard")}
            </Link>
          </div>


          {!isProUser && (
            <div className="mb-5 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[11px] text-[var(--text-main)]">
              <p className="font-semibold mb-1">
                {t("dailySuccessSystem.freePlan.label", "You're on the Free plan.")}
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
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-[11px] active:scale-95 transition-transform"
              >
                {t("dailySuccessSystem.freePlan.viewPro", "View Pro options")}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {statusMessage && <p className="text-xs text-emerald-400 mb-3">{statusMessage}</p>}

          {/* Score stats */}
          <div className="mb-5 grid md:grid-cols-3 gap-3 text-[11px]">
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                {t("dailySuccessSystem.todaysScore.heading", "Today's score")}
              </p>
              <p className="text-xl font-semibold">
                <AnimatedNumber value={score} />
                <span className="text-[11px] text-[var(--text-muted)] ml-1">/100</span>
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
                {avgLast7 !== null ? (
                  <>
                    <AnimatedNumber value={avgLast7} />
                    <span className="text-sm">/100</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {t("dailySuccessSystem.avg7d.help", "Aim for consistency, not perfection.")}
              </p>
            </div>

            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-3">
              <p className="text-[var(--text-muted)] mb-1">
                {t("dailySuccessSystem.streak.label", "Success streak (score ≥ 60)")}
              </p>
              <p className="text-xl font-semibold">
                <AnimatedNumber value={scoreStreak} />
                <span className="ml-1 text-sm">
                  {t(
                    scoreStreak === 1 ? "dailySuccessSystem.streak.day" : "dailySuccessSystem.streak.days",
                    scoreStreak === 1 ? "day" : "days"
                  )}
                </span>
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {t("dailySuccessSystem.streak.help", "Days in a row you rated your day 60+.")}
              </p>
            </div>
          </div>

          {/* ✅ Bio-Rhythm Chart */}
          <div className="mb-6">
            <BioRhythmChart
              data={chartData.map(d => ({
                date: d.score_date,
                energy: d.energy_level,
                score: d.score
              }))}
            />
          </div>

          {scoreLoading && (
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              {t("dailySuccessSystem.score.loadingRecent", "Loading your recent scores…")}
            </p>
          )}
          {scoreMessage && <p className="text-[11px] text-emerald-400 mb-3">{scoreMessage}</p>}

          {/* Main grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Morning */}
            <section
              ref={morningRef}
              className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">
                  {t("dailySuccessSystem.morning.title", "🌅 Morning: Design your day")}
                </h2>
                {/* ✅ Voice Button */}
                <VoiceCaptureButton
                  userId={user?.id || ""}
                  mode="review" // Use review mode for planning/notes
                  variant="icon"
                  size="sm"
                  interaction="hold"
                  onResult={handleMorningVoice}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {t(
                  "dailySuccessSystem.morning.description",
                  "Tell the AI what's on your plate, and it will build a realistic schedule with priorities."
                )}
              </p>

              <form onSubmit={handleMorningPlan} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t("dailySuccessSystem.morning.questionToday", "What's happening today?")}
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
                    {t("dailySuccessSystem.morning.top3.label", "Top 3 priorities")}
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
                  disabled={morningLoading}
                  className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-xs active:scale-95 transition-transform"
                >
                  {morningLoading
                    ? t("dailySuccessSystem.morning.generating", "Generating…")
                    : t("dailySuccessSystem.morning.generateButton", "✨ Generate today's AI plan")}
                </button>
              </form>

              {/* ✅ Result card */}
              {morningPlanError && <p className="mt-3 text-[11px] text-red-400">{morningPlanError}</p>}

              {morningPlan && (
                <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-body)] p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] font-semibold text-[var(--text-main)]">
                      {t("dailySuccessSystem.morning.resultTitle", "Your plan")}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        sendToAssistant(
                          morningPlan,
                          "Give me extra ideas / refinements for this daily plan."
                        )
                      }
                      className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"
                    >
                      {t("dailySuccessSystem.morning.openInAssistant", "Open in Assistant")}
                    </button>

                    {/* ✅ NEW: Create tasks button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateTasks(morningPlan, "morning")}
                      disabled={generatingTasksSource === "morning"}
                      className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] disabled:opacity-50"
                    >
                      {generatingTasksSource === "morning" ? "Creating tasks..." : "⚡ Create tasks"}
                    </button>
                  </div>

                  {renderLabeledSections(morningPlan) || (
                    <pre className="whitespace-pre-wrap text-[11px] text-[var(--text-main)]">
                      {morningPlan}
                    </pre>
                  )}
                </div>
              )}
            </section>

            {/* Evening */}
            <section
              ref={eveningRef}
              className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">
                  {t("dailySuccessSystem.evening.title", "🌙 Evening: Reflect & score your day")}
                </h2>
                {/* ✅ Voice Button */}
                <VoiceCaptureButton
                  userId={user?.id || ""}
                  mode="psych"
                  variant="icon"
                  size="sm"
                  interaction="hold" // or toggle
                  onResult={handleVoiceReflection}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {t(
                  "dailySuccessSystem.evening.description",
                  "Capture how your day went. The AI will turn it into wins, lessons, and improvements for tomorrow."
                )}
              </p>

              <form onSubmit={handleEveningReflection} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t("dailySuccessSystem.evening.questionDay", "How did today actually go?")}
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
                  disabled={eveningLoading}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs active:scale-95 transition-transform"
                >
                  {eveningLoading
                    ? t("dailySuccessSystem.evening.generating", "Generating…")
                    : t("dailySuccessSystem.evening.reflectButton", "💭 Reflect with AI")}
                </button>
              </form>

              {/* ✅ Result card */}
              {eveningResultError && <p className="mt-3 text-[11px] text-red-400">{eveningResultError}</p>}

              {eveningResult && (
                <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-body)] p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] font-semibold text-[var(--text-main)]">
                      {t("dailySuccessSystem.evening.resultTitle", "Your reflection")}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        sendToAssistant(
                          `Here is my AI reflection output:\n\n${eveningResult}\n\nGive me 3 additional ideas to improve tomorrow.`,
                          "Give additional ideas based on my reflection."
                        )
                      }
                      className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"
                    >
                      {t("dailySuccessSystem.evening.openInAssistant", "Open in Assistant")}
                    </button>

                    {/* ✅ NEW: Create tasks button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateTasks(eveningResult, "evening")}
                      disabled={generatingTasksSource === "evening"}
                      className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] disabled:opacity-50"
                    >
                      {generatingTasksSource === "evening" ? "Creating tasks..." : "⚡ Create tasks"}
                    </button>
                  </div>

                  {renderLabeledSections(eveningResult) || (
                    <pre className="whitespace-pre-wrap text-[11px] text-[var(--text-main)]">
                      {eveningResult}
                    </pre>
                  )}
                </div>
              )}

              {/* Score slider + AI suggest */}
              <div ref={scoreRef} className="mt-5 border-t border-[var(--border-subtle)] pt-3">

                {/* ✅ Energy Level Slider */}
                <div className="mb-6">
                  <label className="block text-[11px] text-[var(--text-muted)] mb-2">
                    {t("dailySuccessSystem.evening.energyQuestion", "Energy level at end of day:")}
                  </label>

                  <div className="flex items-center gap-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 rounded-xl">
                    {/* Dynamic Battery Icon */}
                    <div className="shrink-0 w-8 h-12 relative transition-all duration-300">
                      <img
                        src={
                          energyLevel <= 3
                            ? "/images/energy-low.png"
                            : energyLevel >= 8
                              ? "/images/energy-high.png"
                              : "/images/energy-medium.png"
                        }
                        alt="Energy"
                        className="w-full h-full object-contain drop-shadow-sm transition-opacity duration-300"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium ${energyLevel <= 3
                            ? "text-red-400"
                            : energyLevel >= 8
                              ? "text-emerald-400"
                              : "text-[var(--accent)]"
                            }`}
                        >
                          {energyLevel <= 3
                            ? t("energy.low", "Low Battery")
                            : energyLevel >= 8
                              ? t("energy.high", "Full Power!")
                              : t("energy.medium", "Balanced")}
                        </span>
                        <span className="text-xs font-semibold">{energyLevel}/10</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={energyLevel}
                        onChange={(e) => {
                          play("pop");
                          setEnergyLevel(Number(e.target.value));
                        }}
                        className="w-full h-2 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                      />
                    </div>
                  </div>
                </div>

                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t("dailySuccessSystem.evening.scoreQuestion", "How would you rate today overall?")}
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => {
                      play("pop"); // Added play('pop')
                      setScore(Number(e.target.value));
                    }}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span className="text-sm font-semibold w-10 text-right">{score}</span>
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
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-[11px] active:scale-95 transition-transform"
                  >
                    {suggestLoading
                      ? t("dailySuccessSystem.evening.aiSuggestLoading", "Asking AI…")
                      : t("dailySuccessSystem.evening.aiSuggestLabel", "Let AI suggest today's score")}
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
                    {t("dailySuccessSystem.evening.aiSuggestReasonPrefix", "Suggested because:")}{" "}
                    {suggestReason}
                  </p>
                )}

                {suggestError && <p className="mt-2 text-[11px] text-red-400">{suggestError}</p>}

                <button
                  type="button"
                  onClick={handleSaveScore}
                  disabled={savingScore}
                  className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-xs text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  {savingScore
                    ? t("dailySuccessSystem.evening.saveScoreSaving", "Saving...")
                    : t("dailySuccessSystem.evening.saveScoreButton", "Save today's score & energy")}
                </button>
              </div>

              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-[11px] text-[var(--text-muted)] mb-1">
                  {t("dailySuccessSystem.hint.title", "Hint for best results:")}
                </p>
                <ul className="text-[11px] text-[var(--text-muted)] list-disc list-inside space-y-1">
                  <li>{t("dailySuccessSystem.hint.tip1", "Mention 2–3 things you're proud of.")}</li>
                  <li>{t("dailySuccessSystem.hint.tip2", "Be honest about distractions and procrastination.")}</li>
                  <li>{t("dailySuccessSystem.hint.tip3", "Add how you'd like tomorrow to feel.")}</li>
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
      </div >
    </main >
  );
}
