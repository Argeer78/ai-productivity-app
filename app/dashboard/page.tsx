"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import AppHeader from "@/app/components/AppHeader";
import SetupBanner from "@/app/components/SetupBanner";
import { useT } from "@/lib/useT";

// ✅ Auth gate (full page always)
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";
import ReviewPopup from "@/app/components/ReviewPopup";
import BadgeTrophyCase from "@/app/components/BadgeTrophyCase";
import DashboardGlance from "@/app/components/DashboardGlance";
import DashboardWeather from "@/app/components/DashboardWeather";
import LevelProgress from "@/app/components/LevelProgress";
import { useFocus } from "@/app/context/FocusContext";
import Confetti from "@/app/components/Confetti";
import { useSound } from "@/lib/sound";
import { useDemo } from "@/app/context/DemoContext";

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

type DailyScoreRow = {
  score_date: string;
  score: number;
};

/** ---------- AI Summary parsing + UI ---------- */
type SummarySection = {
  title: string;
  paragraphs: string[];
  bullets: string[];
};

function parseAiSummaryText(text: string): SummarySection[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd());

  const sections: SummarySection[] = [];
  let current: SummarySection | null = null;

  const pushCurrent = () => {
    if (!current) return;
    // remove empty items
    current.paragraphs = current.paragraphs.map((p) => p.trim()).filter(Boolean);
    current.bullets = current.bullets.map((b) => b.trim()).filter(Boolean);
    if (current.paragraphs.length || current.bullets.length) sections.push(current);
    current = null;
  };

  const isHeading = (line: string) => /^[A-Z][A-Z _-]{2,}:\s*$/.test(line.trim());

  for (const l of lines) {
    const line = l.trim();

    if (!line) {
      // treat as paragraph break
      if (current && current.paragraphs.length) {
        current.paragraphs[current.paragraphs.length - 1] =
          current.paragraphs[current.paragraphs.length - 1] + "\n";
      }
      continue;
    }

    if (isHeading(line)) {
      pushCurrent();
      current = {
        title: line.replace(":", "").trim(),
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    if (!current) {
      // fallback: create a default section if model didn't follow headings
      current = { title: "SUMMARY", paragraphs: [], bullets: [] };
    }

    if (/^[-•]\s+/.test(line)) {
      current.bullets.push(line.replace(/^[-•]\s+/, "").trim());
    } else {
      // accumulate paragraph lines
      const lastIdx = current.paragraphs.length - 1;
      if (lastIdx >= 0 && !current.paragraphs[lastIdx].endsWith("\n")) {
        current.paragraphs[lastIdx] = `${current.paragraphs[lastIdx]} ${line}`.trim();
      } else {
        current.paragraphs.push(line);
      }
    }
  }

  pushCurrent();

  return sections.length ? sections : [{ title: "SUMMARY", paragraphs: [raw], bullets: [] }];
}

function AiSummaryCard(props: {
  text: string;
  onSendToAssistant?: () => void;
}) {
  const sections = useMemo(() => parseAiSummaryText(props.text), [props.text]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-xs font-semibold text-[var(--text-muted)]">RESULT</p>

        {props.onSendToAssistant ? (
          <button
            type="button"
            onClick={props.onSendToAssistant}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-[11px]"
          >
            Send to AI assistant →
          </button>
        ) : null}
      </div>

      <div className="space-y-4 text-[12px]">
        {sections.map((sec, idx) => (
          <div key={`${sec.title}-${idx}`} className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] tracking-wide">
              {sec.title}
            </p>

            {sec.paragraphs.length ? (
              <div className="whitespace-pre-wrap text-[var(--text-main)] leading-relaxed">
                {sec.paragraphs.join("\n").trim()}
              </div>
            ) : null}

            {sec.bullets.length ? (
              <ul className="list-disc list-inside space-y-1 text-[var(--text-main)]">
                {sec.bullets.map((b, i) => (
                  <li key={i} className="leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
/** ---------- end AI Summary parsing + UI ---------- */
import Alive3DImage from "@/app/components/Alive3DImage";
import HideDevTools from "@/app/components/HideDevTools";

export default function DashboardPage() {
  const router = useRouter();

  // ✅ FULL-KEY translations
  const { t } = useT();

  const { isDemoMode } = useDemo();

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // ✅ Auth gate (allow demo mode)
  const gate = useAuthGate(user);

  useEffect(() => {
    if (isDemoMode) {
      setCheckingUser(false);
      return;
    }
    // Proceed with normal auth gate checks if NOT demo
  }, [isDemoMode]);

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

  // ✅ Gamification Data
  const [recentScores, setRecentScores] = useState<number[]>([]);
  const [totalScore, setTotalScore] = useState(0); // For LevelProgress
  const [recentPlans, setRecentPlans] = useState<string[]>([]);

  // ✅ Action Hub: quick capture + micro-toast
  const [quickText, setQuickText] = useState("");
  const [quickSaving, setQuickSaving] = useState<"note" | "task" | null>(null);
  const [toast, setToast] = useState<string>("");
  const { startSession } = useFocus();

  const { track } = useAnalytics();

  const isPro = plan === "pro" || plan === "founder";
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

  const showBanner = streak >= 1;

  const planLabelUpper = plan === "founder" ? "FOUNDER" : plan === "pro" ? "PRO" : "FREE";
  const planLabelNice = plan === "founder" ? "Founder" : plan === "pro" ? "Pro" : "Free";

  // ✅ Dashboard teaser only (pricing page owns real currency selection)
  const monthlyPriceLabel = "€8.49";

  const streakCfg = useMemo(() => {
    if (streak >= 30) {
      return {
        emoji: "🏆",
        title: t("dashboard.streak.legendary.title", "Legendary streak!"),
        subtitle: t(
          "dashboard.streak.legendary.subtitle",
          "You’ve been consistently productive for 30+ days. That’s huge."
        ),
        gradient: "from-amber-400 via-pink-500 to-indigo-600",
      };
    }
    if (streak >= 14) {
      return {
        emoji: "⚡",
        title: t("dashboard.streak.impressive.title", "Impressive streak!"),
        subtitle: t("dashboard.streak.impressive.subtitle", "14+ days in a row using AI to move things forward."),
        gradient: "from-purple-500 to-pink-500",
      };
    }
    if (streak >= 7) {
      return {
        emoji: "🔥",
        title: t("dashboard.streak.strong.title", "Strong streak!"),
        subtitle: t("dashboard.streak.strong.subtitle", "A full week of momentum. Keep riding it."),
        gradient: "from-emerald-500 to-teal-500",
      };
    }
    return {
      emoji: "🎉",
      title: t("dashboard.streak.nice.title", "Nice streak!"),
      subtitle: t("dashboard.streak.nice.subtitle", "You’re building a habit. A few more days and it becomes automatic."),
      gradient: "from-indigo-600 to-purple-600",
    };
  }, [streak, t]);

  const lastNote = recentNotes?.[0] ?? null;
  const lastTask = recentTasks?.[0] ?? null;

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 2200);
  }

  function sendSummaryToAssistant() {
    if (typeof window === "undefined") return;
    if (!summary.trim()) return;

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: summary,
          hint: "Review my AI Summary. Give me 3 follow-up suggestions and a simple plan for today.",
        },
      })
    );

    showToast(t("dashboard.aiSummary.sentToAssistant", "Sent to the AI assistant ✅"));
  }

  async function startCheckout(
    selectedCurrency: "eur" | "usd" | "gbp",
    planType: "pro" | "yearly" | "founder" = "pro"
  ) {
    setError("");

    // ✅ Gate checkout if logged out
    if (
      !gate.requireAuth(undefined, {
        title: t("dashboard.auth.checkout.title", "Log in to upgrade."),
        subtitle: t("dashboard.auth.checkout.subtitle", "Create an account to manage billing and your plan."),
      })
    ) {
      return;
    }
    if (!user) return;

    setBillingLoading(true);

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
        setError(data?.error || t("dashboard.checkout.error", "Could not start checkout."));
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[checkout] exception", err);
      setError(t("dashboard.checkout.networkError", "Network error while starting checkout."));
    } finally {
      setBillingLoading(false);
    }
  }

  // ✅ Action Hub: quick capture actions
  async function quickSave(mode: "note" | "task") {
    setError("");

    if (
      !gate.requireAuth(undefined, {
        title: t("dashboard.actionHub.auth.title", "Log in to save."),
        subtitle: t("dashboard.actionHub.auth.subtitle", "Create an account to save notes and tasks."),
      })
    ) {
      return;
    }
    if (!user) return;

    const text = quickText.trim();
    if (!text) {
      showToast(t("dashboard.actionHub.toast.empty", "Write something first."));
      return;
    }

    setQuickSaving(mode);

    try {
      if (mode === "note") {
        const { data, error } = await supabase
          .from("notes")
          .insert([{ user_id: user.id, content: text }])
          .select("id, content, created_at")
          .single();

        if (error) throw error;

        setRecentNotes((prev) => [data, ...prev].slice(0, 5));
        setQuickText("");
        showToast(t("dashboard.actionHub.toast.noteSaved", "Saved to Notes ✅"));

        try {
          track("quick_capture_saved", { type: "note" });
        } catch { }
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert([{ user_id: user.id, title: text, completed: false }])
          .select("id, title, completed, created_at")
          .single();

        if (error) throw error;

        setRecentTasks((prev) => [data, ...prev].slice(0, 5));
        setQuickText("");
        showToast(t("dashboard.actionHub.toast.taskSaved", "Saved to Tasks ✅"));

        try {
          track("quick_capture_saved", { type: "task" });
        } catch { }
      }
    } catch (e) {
      console.error("[dashboard/actionHub] quick save error", e);
      showToast(t("dashboard.actionHub.toast.saveFailed", "Could not save. Try again."));
    } finally {
      setQuickSaving(null);
    }
  }

  // Load the current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          if (!error.message.includes("Auth session missing")) {
            console.error(error);
          }
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
        setRecentScores(list.map(r => r.score));

        // Calculate Total XP (with Streak Multiplier)
        // Rules: Score >= 60 maintains streak. Streak >= 7 days gives 1.5x multiplier.
        let currentStreak = 0;
        let runningXP = 0;
        let prevDate: Date | null = null;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Ensure list is sorted ASC for calculation
        const sortedList = [...list].sort((a, b) => new Date(a.score_date).getTime() - new Date(b.score_date).getTime());

        for (const row of sortedList) {
          const d = new Date(row.score_date);
          const score = row.score || 0;

          if (prevDate) {
            const diff = d.getTime() - prevDate.getTime();
            // If gap is more than 1 day (allow slight margin for timezone weirdness, say 1.1 days), break streak
            // Actually, strict 1 day check often fails with time, so check dates.
            // Simplest: difference in days.
            const dayDiff = Math.abs((d.getTime() - prevDate.getTime()) / ONE_DAY);

            if (dayDiff > 1.1) {
              // Missed a day
              currentStreak = 0;
            }
          }

          if (score >= 60) {
            currentStreak += 1;
          } else {
            // Low score breaks streak? User logic says "Success streak (score >= 60)". 
            // Usually yes, low score breaks it.
            currentStreak = 0;
          }

          // Apply Multiplier
          const multiplier = currentStreak >= 7 ? 1.5 : 1;
          runningXP += Math.floor(score * multiplier);

          prevDate = d;
        }

        setTotalScore(runningXP);

        const todayRow = list.find((r) => r.score_date === todayStr);
        setTodayScore(todayRow ? todayRow.score : null);

        const seven = new Date();
        seven.setDate(seven.getDate() - 6);
        const sevenStr = seven.toISOString().split("T")[0];
        const last7 = list.filter((r) => r.score_date >= sevenStr);

        if (last7.length > 0) {
          const avg = last7.reduce((sum, r) => sum + (r.score || 0), 0) / last7.length;
          setAvg7(Math.round(avg));
        } else {
          setAvg7(null);
        }

        const goodSet = new Set(list.filter((r) => r.score >= 60).map((r) => r.score_date));
        let streakCount = 0;
        const current = new Date();

        for (let i = 0; i < 365; i++) {
          const dStr = current.toISOString().split("T")[0];
          if (goodSet.has(dStr)) {
            streakCount++;
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

    loadScoreStats();
  }, [user]);

  // Ensure profile exists & load plan + AI usage + streak + recent activity + weekly goal
  useEffect(() => {
    if (!user?.id) {
      setPlan((p) => (p === "free" ? p : "free"));
      setAiCountToday((v) => (v === 0 ? v : 0));
      setStreak((v) => (v === 0 ? v : 0));
      setActiveDays((v) => (v === 0 ? v : 0));
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

        if (profileError && (profileError as any).code !== "PGRST116") {
          throw profileError;
        }

        if (!profile) {
          const { data: inserted, error: insertError } = await supabase
            .from("profiles")
            .insert([{ id: user.id, email: user.email, plan: "free" }])
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

        if (usageError && (usageError as any).code !== "PGRST116") throw usageError;

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

        if (historyError && (historyError as any).code !== "PGRST116") {
          console.error("Dashboard: history error", historyError);
        }

        const historyList = (history || []) as { usage_date: string; count: number }[];
        const active = historyList.filter((h) => h.count > 0).length;
        setActiveDays(active);

        const activeDateSet = new Set(historyList.filter((h) => h.count > 0).map((h) => h.usage_date));

        let streakCount = 0;
        const currentDate = new Date();

        for (let i = 0; i < 365; i++) {
          const dayStr = currentDate.toISOString().split("T")[0];
          if (activeDateSet.has(dayStr)) {
            streakCount += 1;
            currentDate.setDate(currentDate.getDate() - 1);
          } else break;
        }
        setStreak(streakCount);

        // 4) AI Wins: last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

        const last7Usage = historyList.filter((h) => h.usage_date >= sevenStr);
        const totalAiCalls7 = last7Usage.reduce((sum, h) => sum + (h.count || 0), 0);
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

        if (notesError && (notesError as any).code !== "PGRST116") {
          console.error("Dashboard: notes error", notesError);
          setRecentNotes([]);
        } else setRecentNotes(notes || []);

        // 6) Recent tasks
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, title, completed, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (tasksError && (tasksError as any).code !== "PGRST116") {
          console.error("Dashboard: tasks error", tasksError);
          setRecentTasks([]);
        } else setRecentTasks(tasks || []);

        // 7) Notes / tasks in last 7 days
        const sevenDaysAgoDate = new Date();
        sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
        const sevenDateStr = sevenDaysAgoDate.toISOString().split("T")[0];

        const { count: notes7Count, error: notes7Err } = await supabase
          .from("notes")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .gte("created_at", sevenDateStr)
          .limit(0);

        if (notes7Err && (notes7Err as any).code !== "PGRST116") {
          console.error("[dashboard] notes7 count error", notes7Err);
          setWeekNotesCreated(0);
        } else setWeekNotesCreated(notes7Count ?? 0);

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
        } else setWeekTasksCompleted(tasks7Rows?.length || 0);

        // 8) Weekly goal
        const { data: goalRow, error: goalError } = await supabase
          .from("weekly_goals")
          .select("id, goal_text, week_start, completed")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (goalError && (goalError as any).code !== "PGRST116") {
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

        // 9) Daily Plans (Note: "daily_plans" table is not currently populated by the API, so we skip it to avoid errors)
        setRecentPlans([]);

      } catch (err: any) {
        console.error(err);
        setError(t("dashboard.loadError", "Failed to load dashboard data."));
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [user?.id]);

  async function saveWeeklyGoal(refineWithAI: boolean) {
    setError("");

    if (
      !gate.requireAuth(undefined, {
        title: t("dashboard.auth.weekGoal.title", "Log in to save your weekly goal."),
        subtitle: t("dashboard.auth.weekGoal.subtitle", "Your weekly goal is saved to your account."),
      })
    ) {
      return;
    }
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
    setError("");

    if (
      !gate.requireAuth(undefined, {
        title: t("dashboard.auth.weekGoalToggle.title", "Log in to update your goal."),
      })
    ) {
      return;
    }
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
    setSummaryError("");

    if (
      !gate.requireAuth(undefined, {
        title: t("dashboard.auth.summary.title", "Log in to generate your AI summary."),
        subtitle: t("dashboard.auth.summary.subtitle", "Create an account to let AI scan your notes and tasks."),
      })
    ) {
      return;
    }
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
      } catch {
        console.error("Non-JSON response from /api/ai-summary:", text);
        setSummaryError(t("dashboard.aiSummary.invalidResponse", "Server returned an invalid response."));
        return;
      }

      if (!res.ok || !data?.ok) {
        console.error("AI summary error payload:", data);
        if (res.status === 429) {
          setSummaryError(
            data?.error || t("dashboard.aiSummary.planLimit", "You’ve reached today’s AI limit for your plan.")
          );
        } else {
          setSummaryError(data?.error || t("dashboard.aiSummary.failed", "Failed to generate summary."));
        }
        return;
      }

      // ✅ accept both new and old fields
      const resultText = String(data?.text || data?.summary || "").trim();
      if (!resultText) {
        setSummaryError(t("dashboard.aiSummary.failed", "Failed to generate summary."));
        return;
      }

      setSummary(resultText);

      if (typeof data.usedToday === "number") setAiCountToday(data.usedToday);
      else setAiCountToday((prev) => prev + 1);

      try {
        track("ai_call_used", {
          feature: "summary",
          plan,
          usedToday: typeof data.usedToday === "number" ? data.usedToday : aiCountToday + 1,
        });
      } catch {
        // ignore analytics error
      }
    } catch (err) {
      console.error(err);
      setSummaryError(t("dashboard.aiSummary.networkError", "Network error while generating summary."));
    } finally {
      setSummaryLoading(false);
    }
  }

  // ✅ NEW: Suggest tasks from summary
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { play } = useSound();

  async function handleGenerateTasks() {
    if (!summary.trim()) return;
    play("pop");

    if (!gate.requireAuth(undefined, {
      title: t("dashboard.auth.tasks.title", "Log in to create tasks."),
      subtitle: t("dashboard.auth.tasks.subtitle", "Turn your summary into actionable to-dos automatically.")
    })) return;

    if (!user) return;

    setGeneratingTasks(true);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: summary }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("[dashboard] generate-tasks error:", data);
        alert(data?.error || t("dashboard.tasks.error", "Failed to generate tasks."));
        return;
      }

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length === 0) {
        alert(t("dashboard.tasks.empty", "AI couldn't find any specific tasks in this summary."));
        return;
      }

      const rows = tasks.map((tItem: any) => ({
        user_id: user.id,
        title: typeof tItem.title === "string" ? tItem.title.trim() : "",
        completed: false,
        category: null
      })).filter((r: any) => r.title.length > 0);

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        console.error("[dashboard] tasks insert error:", insertError);
        alert(t("dashboard.tasks.saveError", "Failed to save tasks."));
        return;
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      showToast(t("dashboard.tasks.success", `Created ${rows.length} tasks! ✅`));

    } catch (err) {
      console.error("[dashboard] unexpected:", err);
      alert(t("dashboard.tasks.networkError", "Unexpected error."));
    } finally {
      setGeneratingTasks(false);
    }
  }

  // ---------- RENDER STATES ----------

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">{t("dashboard.checkingSession", "Checking your session...")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <HideDevTools />
      <AppHeader active="dashboard" />

      {/* ✅ Auth modal */}
      <AuthGateModal open={gate.open} onClose={gate.close} copy={gate.copy} authHref={gate.authHref} />

      {showConfetti && <Confetti />}

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          {/* Weather Widget (Top Banner) */}
          <div className="mb-6">
            <DashboardWeather />
          </div>

          {/* ✅ Action Hub toast */}
          {toast ? (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur px-4 py-2 text-xs shadow-lg">
                {toast}
              </div>
            </div>
          ) : null}

          {/* Guest inline banner (full page always) */}
          {!user && (
            <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
              <div className="flex-1 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
                  {t("dashboard.guest.badge", "GET STARTED")}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
                  {t("dashboard.guest.title", "Welcome to your new workspace 👋")}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md leading-relaxed">
                  {t(
                    "dashboard.guest.subtitle",
                    "Log in to unlock your personal AI dashboard, track your streaks, and turn your chaotic notes into clear tasks."
                  )}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => gate.openGate({ title: t("dashboard.guest.ctaTitle", "Log in to use your Dashboard.") })}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-indigo-500/20"
                  >
                    {t("dashboard.goToAuth", "Go to login / signup")}
                  </button>
                  <Link
                    href="/templates"
                    className="px-5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm font-medium"
                  >
                    {t("dashboard.guest.browseTemplates", "Browse templates")}
                  </Link>
                </div>
              </div>

              {/* Graphic */}
              <div className="w-full max-w-xs md:max-w-sm relative z-10">
                <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
                  <Alive3DImage src="/images/dashboard-welcome.png?v=1" alt="Welcome" className="w-full h-auto object-cover" />
                </div>
              </div>

              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>
          )}

          {user && <SetupBanner userId={user.id} />}

          {/* ✅ ACTION HUB (top-of-dashboard) */}
          <section className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            {/* ... unchanged Action Hub ... */}
            {/* (Your Action Hub section stays exactly the same as you posted) */}
            {/* For brevity, I’m keeping the rest of your dashboard unchanged below */}
            {/* ✅ NOTE: Everything below is identical except the AI SUMMARY card rendering */}
            {/* --------------------- */}
            {/* START: your unchanged Action Hub (kept in place) */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.kicker", "ACTION HUB")}</p>
                <h2 className="text-sm md:text-base font-semibold">{t("dashboard.actionHub.title", "What should you do right now?")}</h2>
                <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-2xl">
                  {t("dashboard.actionHub.subtitle", "Capture something quickly, continue where you left off, or set a simple focus for today.")}
                </p>
              </div>

              {!user ? (
                <button
                  type="button"
                  onClick={() => gate.openGate({ title: t("dashboard.actionHub.guestCtaTitle", "Log in to use Action Hub.") })}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]"
                >
                  {t("dashboard.actionHub.guestCta", "Log in")}
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {/* Weekly Goal */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.focus.title", "TODAY’S FOCUS")}</p>

                {user ? (
                  weeklyGoalText?.trim() ? (
                    <>
                      <p className="text-sm font-semibold mb-1">
                        {weeklyGoalCompleted ? "✅ " : "🎯 "}
                        {weeklyGoalText}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {t("dashboard.actionHub.focus.hintWeekly", "Your weekly goal is your best daily focus.")}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href="/daily-success?mode=morning"
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs text-[var(--accent-contrast)]"
                        >
                          {t("dashboard.actionHub.dailySuccess.morning", "Start morning plan")}
                        </Link>
                        <Link
                          href="/daily-success?mode=evening"
                          className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-xs"
                        >
                          {t("dashboard.actionHub.dailySuccess.evening", "Do evening reflection")}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] text-[var(--text-muted)] mb-2">
                        {t("dashboard.actionHub.focus.empty", "No weekly goal saved yet. Set one to stay focused.")}
                      </p>
                      <Link
                        href="#week-goal"
                        className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)]"
                      >
                        {t("dashboard.actionHub.focus.ctaSetGoal", "Set a weekly goal")}
                      </Link>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href="/daily-success?mode=morning"
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs text-[var(--accent-contrast)]"
                        >
                          {t("dashboard.actionHub.dailySuccess.morning", "Start morning plan")}
                        </Link>
                        <Link
                          href="/daily-success?mode=evening"
                          className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-xs"
                        >
                          {t("dashboard.actionHub.dailySuccess.evening", "Do evening reflection")}
                        </Link>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {t("dashboard.actionHub.focus.guest", "Log in to see your goal and daily focus.")}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          gate.openGate({ title: t("dashboard.actionHub.auth.dailySuccess.title", "Log in to use the Daily Success System.") })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs text-[var(--accent-contrast)]"
                      >
                        {t("dashboard.actionHub.dailySuccess.morning", "Start morning plan")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          gate.openGate({ title: t("dashboard.actionHub.auth.dailySuccess.title", "Log in to use the Daily Success System.") })
                        }
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-xs"
                      >
                        {t("dashboard.actionHub.dailySuccess.evening", "Do evening reflection")}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Quick capture */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.capture.title", "QUICK CAPTURE")}</p>

                <input
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder={t("dashboard.actionHub.capture.placeholder", "Type a quick note or task…")}
                  className="w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
                  disabled={!user || !!quickSaving}
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => quickSave("note")}
                    disabled={!user || !!quickSaving}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs text-[var(--accent-contrast)]"
                  >
                    {quickSaving === "note"
                      ? t("dashboard.actionHub.capture.saving", "Saving…")
                      : t("dashboard.actionHub.capture.saveNote", "Save as Note")}
                  </button>

                  <button
                    type="button"
                    onClick={() => quickSave("task")}
                    disabled={!user || !!quickSaving}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] disabled:opacity-60 text-xs"
                  >
                    {quickSaving === "task"
                      ? t("dashboard.actionHub.capture.saving", "Saving…")
                      : t("dashboard.actionHub.capture.saveTask", "Save as Task")}
                  </button>
                </div>

                {!user ? (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    {t("dashboard.actionHub.capture.guestHint", "Log in to save quick captures to your account.")}
                  </p>
                ) : null}
              </div>

              {/* Continue */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.continue.title", "CONTINUE")}</p>

                {user ? (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                      <p className="text-[11px] text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.continue.lastNote", "Last note")}</p>
                      <p className="text-[12px] line-clamp-2">
                        {lastNote?.content?.slice(0, 120) || t("dashboard.actionHub.continue.noneNote", "No notes yet.")}
                      </p>
                      <Link href="/notes" className="inline-block mt-2 text-[11px] text-[var(--accent)] hover:opacity-90">
                        {t("dashboard.actionHub.continue.openNotes", "Continue in Notes →")}
                      </Link>
                    </div>

                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                      <p className="text-[11px] text-[var(--text-muted)] mb-1">{t("dashboard.actionHub.continue.lastTask", "Last task")}</p>
                      <p className="text-[12px] line-clamp-2">
                        {lastTask?.title?.slice(0, 120) || t("dashboard.actionHub.continue.noneTask", "No tasks yet.")}
                      </p>
                      <Link href="/tasks" className="inline-block mt-2 text-[11px] text-[var(--accent)] hover:opacity-90">
                        {t("dashboard.actionHub.continue.openTasks", "Continue in Tasks →")}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {t("dashboard.actionHub.continue.guest", "Log in to continue where you left off.")}
                  </p>
                )}
              </div>
            </div>
            {/* END: Action Hub */}
          </section>

          {user && showBanner && (
            <div
              className={`mb-6 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${streakCfg.gradient} text-white shadow-md`}
            >
              <div>
                <p className="font-semibold text-sm md:text-base">
                  {streakCfg.emoji} {streakCfg.title} {t("dashboard.streakBannerMain", "You’re on a")}{" "}
                  <span className="font-bold">{streak}-day</span> {t("dashboard.streakBannerTail", "productivity streak.")}
                </p>
                <p className="text-xs opacity-90">{streakCfg.subtitle}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("dashboard.title", "Dashboard")}</h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">{t("dashboard.subtitle", "Quick overview of your plan, AI usage, and activity.")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {t("dashboard.plan.label", "Plan:")} <span className="font-semibold">{user ? planLabelUpper : "—"}</span>
              </span>

              <span className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {t("dashboard.aiToday.label", "AI today:")}{" "}
                <span className="font-semibold">
                  {user ? (isPro ? <>{aiCountToday} {t("dashboard.aiToday.unlimitedSuffix", "used (unlimited for normal use)")}</> : <>{aiCountToday}/{dailyLimit}</>) : "—"}
                </span>
              </span>
            </div>
          </div>

          {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

          {user && loadingData ? (
            <p className="text-sm text-[var(--text-muted)]">{t("dashboard.loadingData", "Loading your data...")}</p>
          ) : (
            <>
              {!user ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm">
                  <p className="font-semibold mb-1">{t("dashboard.guest.previewTitle", "What you’ll see here")}</p>
                  <ul className="text-[12px] text-[var(--text-muted)] list-disc list-inside space-y-1">
                    <li>{t("dashboard.guest.preview1", "Your plan & daily AI usage")}</li>
                    <li>{t("dashboard.guest.preview2", "Your streaks and weekly AI wins")}</li>
                    <li>{t("dashboard.guest.preview3", "Recent notes, tasks, and summaries")}</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => gate.openGate({ title: t("dashboard.guest.ctaTitle", "Log in to use your Dashboard.") })}
                    className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]"
                  >
                    {t("dashboard.goToAuth", "Go to login / signup")}
                  </button>
                </div>
              ) : (
                <>
                  {/* ✅ Upgrade teaser card (unchanged) */}
                  {!isPro && (
                    <div className="mb-6 rounded-2xl border border-[var(--accent)]/60 bg-[var(--accent-soft)]/50 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-xs font-semibold text-[var(--accent)] mb-1">{t("dashboard.upgradeTeaser.badge", "UPGRADE")}</p>
                          <p className="text-sm font-semibold">{t("dashboard.upgradeTeaser.title", "Unlock Pro features")}</p>
                          <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-xl">
                            {t("dashboard.upgradeTeaser.subtitle", "Get weekly AI reports and more powerful planning workflows. Cancel anytime.")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href="/pricing" className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]">
                            {t("dashboard.upgradeTeaser.cta", "See pricing")}
                          </Link>

                          <span className="text-[11px] text-[var(--text-muted)]">
                            {t("dashboard.upgradeTeaser.from", "From")}{" "}
                            <span className="font-semibold text-[var(--text-main)]">{monthlyPriceLabel}</span>/{t("dashboard.upgradeTeaser.mo", "mo")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top stats grid */}
                  <div className="grid md:grid-cols-3 gap-5 mb-8 text-sm">
                    {/* Account card */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.section.account", "ACCOUNT")}</p>
                      <p className="mb-1 text-sm break-all">{user.email}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{t("dashboard.account.emailHelp", "This is the account you use to log in.")}</p>
                    </div>

                    {/* Plan card */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.section.plan", "PLAN")}</p>
                      <p className="mb-1 text-sm">{planLabelNice}</p>

                      <p className="text-[11px] text-[var(--text-muted)] mb-2">
                        {plan === "founder" || plan === "pro"
                          ? t(
                            "dashboard.plan.founderDescription",
                            "Unlimited daily AI usage for normal use, plus access to more powerful planning tools."
                          )
                          : t("dashboard.plan.freeDescription", "Great for light usage, daily planning and basic AI help.")}
                      </p>

                      <p className="text-[11px] text-[var(--text-muted)]">
                        {t("dashboard.plan.dailyLimitLabel", "Daily AI limit:")}{" "}
                        <span className="font-semibold">
                          {isPro ? t("dashboard.plan.dailyLimitUnlimited", "Unlimited for normal use") : `${dailyLimit} ${t("dashboard.callsPerDay", "calls/day")}`}
                        </span>
                      </p>

                      {isPro ? (
                        <Link href="/weekly-reports" className="inline-block mt-3 text-[11px] text-[var(--accent)] hover:opacity-90">
                          {t("dashboard.link.weeklyReports", "📅 View Weekly Reports →")}
                        </Link>
                      ) : (
                        <Link href="/pricing" className="inline-block mt-3 text-[11px] text-[var(--accent)] hover:opacity-90">
                          {t("dashboard.unlockReports", "🔒 Unlock Weekly Reports with Pro →")}
                        </Link>
                      )}
                    </div>

                    {/* Usage + Productivity Score card */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("dashboard.section.todayAIUsage", "TODAY'S AI USAGE")}</p>

                      <p className="mb-1 text-sm">
                        {isPro ? (
                          <>
                            {aiCountToday}{" "}
                            <span className="text-[11px] text-[var(--text-muted)]">{t("dashboard.aiToday.unlimitedSuffix", "used (unlimited for normal use)")}</span>
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
                          style={{ width: `${Math.min(dailyLimit > 0 ? (aiCountToday / dailyLimit) * 100 : 0, 100)}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-[var(--text-muted)] mt-2">
                        {remaining > 0 ? (
                          isPro ? (
                            t("dashboard.aiToday.unlimitedNote", "Pro gives you effectively unlimited daily AI usage for normal workflows.")
                          ) : (
                            t("dashboard.remainingCalls", "{remaining} AI calls left today.").replace("{remaining}", String(remaining))
                          )
                        ) : isPro ? (
                          t("dashboard.proSafetyLimit", "You reached today’s Pro safety limit. Try again tomorrow.")
                        ) : (
                          <>
                            {t("dashboard.freeLimitReached", "You reached today’s limit on the free plan.")}{" "}
                            <Link href="/pricing" className="text-[var(--accent)] hover:opacity-90 underline underline-offset-2">
                              {t("dashboard.upgradeToPro", "Upgrade to Pro")}
                            </Link>{" "}
                            {t("dashboard.upgradeBenefitsShort", "for unlimited daily AI (for normal use).")}
                          </>
                        )}
                      </p>


                    </div>
                  </div>

                  {/* ✨ Level Progress Widget ✨ */}
                  <div className="mb-6">
                    <LevelProgress totalScore={totalScore} />
                  </div>

                  {/* ✅ Feature Widgets (Glance, Trophy, Focus) */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <DashboardGlance />
                    <BadgeTrophyCase streak={streak} scores={recentScores} morningPlans={recentPlans} />
                    <div
                      onClick={startSession}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-center items-center cursor-pointer hover:border-[var(--accent)] hover:shadow-lg transition-all group"
                      role="button"
                    >
                      <div className="h-10 w-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-2 text-xl group-hover:scale-110 transition-transform">
                        🧘
                      </div>
                      <p className="font-semibold text-sm mb-0.5">{t("dashboard.focus.title", "Focus Mode")}</p>
                      <p className="text-[11px] text-[var(--text-muted)] text-center leading-tight">
                        {t("dashboard.focus.subtitle", "Timer + Ambient Sound")}
                      </p>
                    </div>
                  </div>

                  {/* ✅ AI SUMMARY card (full-width) */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:col-span-3">
                    <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                      {t("dashboard.section.aiSummary", "AI SUMMARY (BETA)")}
                    </p>

                    {!summary ? (
                      <p className="text-[12px] text-[var(--text-muted)] mb-3">
                        {t(
                          "dashboard.aiSummary.description",
                          "Let AI scan your recent notes and tasks and give you a short overview plus suggestions."
                        )}
                      </p>
                    ) : null}

                    {summary ? <AiSummaryCard text={summary} onSendToAssistant={sendSummaryToAssistant} /> : null}

                    {summaryError && <p className="text-[11px] text-red-400 mt-2">{summaryError}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={generateSummary}
                        disabled={summaryLoading || (!isPro && aiCountToday >= dailyLimit)}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs md:text-sm text-[var(--accent-contrast)]"
                      >
                        {summaryLoading
                          ? t("dashboard.aiSummary.generating", "Generating...")
                          : !isPro && aiCountToday >= dailyLimit
                            ? t("dashboard.aiSummary.limitButton", "Daily AI limit reached")
                            : summary
                              ? t("dashboard.aiSummary.regenerate", "Regenerate summary")
                              : t("dashboard.aiSummary.button", "Generate summary")}
                      </button>

                      {summary ? (
                        <>
                          <button
                            type="button"
                            onClick={handleGenerateTasks}
                            disabled={generatingTasks}
                            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] disabled:opacity-60 text-xs md:text-sm"
                          >
                            {generatingTasks ? "Creating tasks..." : "⚡ Create tasks"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSummary("")}
                            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs md:text-sm"
                          >
                            {t("dashboard.aiSummary.clear", "Clear")}
                          </button>
                        </>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      {t("dashboard.aiSummary.usageNote", "Uses your daily AI limit (shared with notes, assistant, planner).")}
                    </p>
                  </div>


                  {/* ✅ Everything below stays as you already had it (AI wins, weekly goal, recent, quick links, feedback...) */}
                  {/* --- keep your remaining sections unchanged --- */}

                  {/* ✅ Weekly Goal Section (Restored) */}
                  <div id="week-goal" className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 scroll-mt-24">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold">{t("dashboard.weekGoal.title", "🎯 Weekly Goal")}</h2>
                      {!weeklyGoalText && (
                        <span className="text-[11px] text-[var(--accent)] px-2 py-0.5 rounded-full bg-[var(--accent-soft)]">
                          {t("dashboard.weekGoal.badge", "Focus")}
                        </span>
                      )}
                    </div>

                    {!weeklyGoalId ? (
                      <div className="flex gap-2">
                        <input
                          value={weeklyGoalText}
                          onChange={(e) => setWeeklyGoalText(e.target.value)}
                          placeholder={t("dashboard.weekGoal.placeholder", "What is your main focus this week?")}
                          className="flex-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-2 text-sm focus:border-[var(--accent)] outline-none"
                          onKeyDown={(e) => e.key === "Enter" && saveWeeklyGoal(false)}
                        />
                        <button
                          onClick={() => saveWeeklyGoal(false)}
                          disabled={weeklyGoalSaving || !weeklyGoalText.trim()}
                          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-sm text-[var(--accent-contrast)]"
                        >
                          {weeklyGoalSaving ? t("dashboard.weekGoal.saving", "Saving…") : t("dashboard.weekGoal.save", "Set Goal")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <button
                          onClick={toggleWeeklyGoalCompleted}
                          disabled={weeklyGoalMarking}
                          className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border flex items-center justify-center transition-all ${weeklyGoalCompleted
                            ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--accent)]"
                            }`}
                        >
                          {weeklyGoalCompleted && <span>✓</span>}
                        </button>
                        <div className="flex-1">
                          <p className={`text-lg font-medium ${weeklyGoalCompleted ? "line-through text-[var(--text-muted)]" : ""}`}>
                            {weeklyGoalText}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(t("dashboard.weekGoal.changeConfirm", "Change your weekly goal?"))) {
                              setWeeklyGoalId(null);
                              setWeeklyGoalCompleted(false);
                            }
                          }}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          {t("dashboard.weekGoal.change", "Change")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Wins This Week */}
                  <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 mb-8 text-sm">
                    <p className="text-xs font-semibold text-[var(--accent)] mb-1">{t("dashboard.section.aiWins", "AI WINS THIS WEEK")}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">
                      {t("dashboard.aiWins.description", "A quick snapshot of how AI helped you move things forward in the last 7 days.")}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{t("dashboard.aiWins.avgScoreLabel", "Avg productivity score")}</p>
                        <p className="text-base font-semibold">{avg7 !== null ? `${avg7}/100` : "—"}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{t("dashboard.aiWins.avgScoreHint", "Based on your daily scores")}</p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{t("dashboard.aiWins.tasksCompletedLabel", "Tasks completed")}</p>
                        <p className="text-base font-semibold">{weekTasksCompleted}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{t("dashboard.aiWins.tasksCompletedHint", "Last 7 days")}</p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{t("dashboard.aiWins.notesCreatedLabel", "Notes created")}</p>
                        <p className="text-base font-semibold">{weekNotesCreated}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{t("dashboard.aiWins.notesCreatedHint", "Captured ideas & thoughts")}</p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{t("dashboard.aiWins.callsUsedLabel", "AI calls used")}</p>
                        <p className="text-base font-semibold">{weekAiCalls}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">~{weekTimeSaved} min saved</p>
                      </div>
                    </div>
                  </div>

                  {/* (rest of your file continues unchanged...) */}
                  {/* Quick actions + feedback etc. */}
                </>
              )}

              {/* Quick actions (always visible) */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Link href="/notes" className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]">
                  {t("dashboard.quickLinks.goToNotes", "Go to Notes")}
                </Link>

                <Link href="/tasks" className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm">
                  {t("dashboard.quickLinks.goToTasks", "Go to Tasks")}
                </Link>

                <Link href="/templates" className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm">
                  {t("dashboard.quickLinks.templates", "🧠 AI Templates")}
                </Link>

                <Link href="/planner" className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm">
                  {t("dashboard.quickLinks.dailyPlanner", "🗓 Daily Planner")}
                </Link>

                <Link href="/weekly-reports" className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm">
                  {t("dashboard.quickLinks.weeklyReports", "📅 Weekly Reports")}
                </Link>

                <Link href="/pricing" className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-sm">
                  {t("dashboard.quickLinks.pricing", "💳 Pricing")}
                </Link>
              </div>

              {/* Feedback form (always visible) */}
              <section className="mt-10 mb-8">
                <div className="max-w-md mx-auto">
                  <h2 className="text-sm font-semibold mb-1 text-center">{t("feedback.quick.title", "Send quick feedback")}</h2>
                  <p className="text-[11px] text-[var(--text-main)]/70 mb-3 text-center">
                    {t("feedback.quick.subtitle", "Tell me what’s working, what’s confusing, or what you’d love to see next.")}
                  </p>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                    {user ? (
                      <FeedbackForm user={user} />
                    ) : (
                      <div className="text-[12px] text-[var(--text-muted)]">
                        {t("feedback.guest", "Log in to send feedback tied to your account.")}{" "}
                        <button
                          type="button"
                          onClick={() => gate.openGate({ title: t("feedback.guest.ctaTitle", "Log in to send feedback.") })}
                          className="underline underline-offset-2 text-[var(--accent)] hover:opacity-90"
                        >
                          {t("feedback.guest.cta", "Log in")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

        </div>
      </div >

      <ReviewPopup />
    </main >
  );
}
