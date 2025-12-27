// app/planner/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useT } from "@/lib/useT";

// ✅ Auth gate
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";
import { useLanguage } from "@/app/components/LanguageProvider";
import Alive3DImage from "@/app/components/Alive3DImage";
import MagicLoader from "@/app/components/MagicLoader";
import Confetti from "@/app/components/Confetti";
import { useSound } from "@/lib/sound";

/* ---------------- UI helpers ---------------- */

function renderSmartTextBlocks(text: string) {
  const lines = (text || "").split("\n").map((l) => l.trimEnd());

  const blocks: Array<
    | { type: "heading"; text: string }
    | { type: "bullet"; text: string }
    | { type: "text"; text: string }
    | { type: "spacer" }
  > = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "spacer" });
      continue;
    }

    // Headings like: "Top 3 priorities", "Schedule:", "Suggested order", etc
    const looksLikeHeading =
      /^[A-Z][A-Za-z0-9 '’/()&-]{2,}$/.test(line) ||
      /^[A-Za-z0-9 '’/()&-]{2,}:\s*$/.test(line);

    if (looksLikeHeading) {
      blocks.push({ type: "heading", text: line.replace(/:\s*$/, "") });
      continue;
    }

    // Bullets: "-", "•", "1.", "2)"
    const bulletMatch = line.match(/^[-•]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);

    if (bulletMatch?.[1]) {
      blocks.push({ type: "bullet", text: bulletMatch[1] });
      continue;
    }

    blocks.push({ type: "text", text: line });
  }

  // compact repeated spacers
  const compact: typeof blocks = [];
  for (const b of blocks) {
    if (b.type === "spacer" && compact[compact.length - 1]?.type === "spacer") continue;
    compact.push(b);
  }

  return compact;
}

export default function PlannerPage() {
  // ✅ Match keys: planner.*
  const { t: rawT } = useT();
  const t = useMemo(
    () => (key: string, fallback: string) => rawT(`planner.${key}`, fallback),
    [rawT]
  );

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // ✅ Correct hook usage (pass user directly)
  const gate = useAuthGate(user);

  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Session bootstrap (safe + consistent)
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        if (!mounted) return;
        setUser(data?.user ?? null);
      } finally {
        if (mounted) setCheckingUser(false);
      }

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      });

      return () => sub.subscription.unsubscribe();
    }

    let cleanup: undefined | (() => void);
    init().then((fn) => (cleanup = fn));

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  function sendToAssistant(content: string, hint: string) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: { content, hint },
      })
    );
  }

  async function generatePlan() {
    setError("");

    // ✅ Gate only when action needs auth
    if (
      !gate.requireAuth(undefined, {
        title: t("auth.title", "Log in to use Daily Planner."),
        subtitle: t(
          "auth.subtitle",
          "Your planner uses your saved tasks, so it needs an account."
        ),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    setPlanText("");

    const reqId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Request-Id": reqId,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const raw = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error(`[planner] NON-JSON response (status=${res.status}, reqId=${reqId})`, raw);
        setError(
          t("error.invalidResponse", "Server returned an invalid response. Please try again.")
        );
        return;
      }

      // ✅ Accept new payload { ok, text } and fallback to older { plan }
      const text =
        typeof data?.text === "string"
          ? data.text
          : typeof data?.plan === "string"
            ? data.plan
            : "";

      const okFlag = typeof data?.ok === "boolean" ? data.ok : res.ok;

      if (!res.ok || !okFlag || !text) {
        console.error(`[planner] API error payload (status=${res.status}, reqId=${reqId})`, data);

        if (res.status === 401) {
          gate.openGate({
            title: t("error.unauthorizedTitle", "Session expired."),
            subtitle: t("error.unauthorized", "You must be logged in to use the daily planner."),
          });
          setError(
            data?.error || t("error.unauthorized", "You must be logged in to use the daily planner.")
          );
          return;
        }

        if (res.status === 429) {
          setError(
            data?.error ||
            t(
              "error.rateLimit",
              "You’ve reached today’s AI limit for your plan. Try again tomorrow or upgrade to Pro."
            )
          );
          return;
        }

        setError(data?.error || t("error.generic", "Failed to generate daily plan."));
        return;
      }

      setPlanText(String(text));
    } catch (err) {
      console.error(`[planner] network/exception (reqId=${reqId})`, err);
      setError(t("error.network", "Network error while generating your plan."));
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Suggest tasks from plan
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const router = useRouter();
  const { play } = useSound();

  async function handleGenerateTasks() {
    if (!planText.trim()) return;
    play("pop");

    if (!gate.requireAuth(undefined, {
      title: t("auth.tasks.title", "Log in to create tasks."),
      subtitle: t("auth.tasks.subtitle", "Turn your plan into actionable to-dos automatically.")
    })) return;

    if (!user) return;

    setGeneratingTasks(true);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: planText }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("[planner] generate-tasks error:", data);
        alert(data?.error || t("tasks.error", "Failed to generate tasks."));
        return;
      }

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length === 0) {
        alert(t("tasks.empty", "AI couldn't find any specific tasks in this plan."));
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
        console.error("[planner] tasks insert error:", insertError);
        alert(t("tasks.saveError", "Failed to save tasks."));
        return;
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      if (confirm(t("tasks.success", `Created ${rows.length} tasks! Go to Tasks page?`))) {
        router.push("/tasks");
      }
    } catch (err) {
      console.error("[planner] unexpected:", err);
      alert(t("tasks.networkError", "Unexpected error."));
    } finally {
      setGeneratingTasks(false);
    }
  }

  const blocks = useMemo(() => {
    if (!planText) return [];
    return renderSmartTextBlocks(planText);
  }, [planText]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          {t("checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)]">
      {showConfetti && <Confetti />}
      <AppHeader active="planner" />

      {/* ✅ Always mounted so the button can open it */}
      <AuthGateModal open={gate.open} onClose={gate.close} copy={gate.copy} authHref={gate.authHref} />

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("title", "Daily Planner")}</h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              {t("subtitle", "Let AI turn your tasks into a focused plan for today.")}
            </p>
          </div>

          <div className="text-[11px] text-[var(--text-muted)]">
            {user?.email ? (
              <>
                {t("loggedInAs", "Logged in as")} <span className="font-semibold">{user.email}</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {t("loggedOutBadge", "Not logged in")}
                </span>
                <Link
                  href="/auth"
                  className="text-[var(--accent)] hover:opacity-90 underline underline-offset-2"
                >
                  {t("goToAuth", "Log in")}
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Guest Banner */}
        {!user && (
          <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
            <div className="flex-1 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
                AI DAILY PLANNER
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
                Focus on what matters 🎯
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md leading-relaxed">
                Let AI analyze your tasks and create a realistic, prioritized schedule for your day.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => gate.openGate()}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-indigo-500/20"
                >
                  Log in to plan your day
                </button>
              </div>
            </div>
            <div className="w-full max-w-sm relative z-10 mt-8 md:mt-0">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] bg-white">
                <Alive3DImage src="/images/planner-hero.png" alt="Planner" className="w-full h-auto" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>
        )}

        {/* Planner controls */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-4 text-sm">
          <p className="text-[12px] text-[var(--text-main)] mb-2">
            {t(
              "description",
              "This planner looks at your open tasks in the app and suggests what to focus on today. You can refresh it during the day if your priorities change."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generatePlan}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-xs md:text-sm"
            >
              {loading ? t("generatingButton", "Generating plan...") : t("generateButton", "Generate today’s plan")}
            </button>

            {planText ? (
              <button
                type="button"
                onClick={() =>
                  sendToAssistant(
                    planText,
                    "Give me a few extra ideas, improvements, and alternatives for this daily plan."
                  )
                }
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs md:text-sm"
              >
                {t("sendToAssistant", "Send to AI assistant for more ideas")}
              </button>
            ) : null}
          </div>

          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {t("generateNote", "Uses your daily AI limit (shared with notes, assistant, and dashboard summary).")}
          </p>

          {error && <div className="mt-3 text-[11px] text-red-400">{error}</div>}

          <div className="mt-3 text-[11px] text-[var(--text-muted)] flex gap-3 flex-wrap">
            <Link href="/tasks" className="hover:text-[var(--accent)]">
              {t("viewTasksLink", "→ View & edit your tasks")}
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--accent)]">
              {t("openDashboard", "Open Dashboard")}
            </Link>
          </div>
        </div>

        {/* Plan output (clean readable box) */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm min-h-[160px]">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {t("section.todayPlan", "TODAY'S PLAN")}
            </p>

            {planText ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(planText)}
                  className="text-[11px] text-[var(--accent)] hover:opacity-90 underline underline-offset-2"
                >
                  {t("copyPlan", "Copy")}
                </button>

                {/* ✅ NEW: Create tasks button */}
                <button
                  type="button"
                  onClick={handleGenerateTasks}
                  disabled={generatingTasks}
                  className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] disabled:opacity-50"
                >
                  {generatingTasks ? "Creating tasks..." : "⚡ Create tasks"}
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-4">
              <MagicLoader lines={6} />
              <p className="text-center text-[11px] text-[var(--text-muted)] mt-3 animate-pulse">
                {t("generatingMessage", "Analyzing your tasks & designing your day...")}
              </p>
            </div>
          ) : planText ? (
            <div className="space-y-2">
              {blocks.map((b, idx) => {
                if (b.type === "spacer") return <div key={idx} className="h-2" />;

                if (b.type === "heading") {
                  return (
                    <h3 key={idx} className="text-[12px] font-semibold text-[var(--text-main)] mt-2">
                      {b.text}
                    </h3>
                  );
                }

                if (b.type === "bullet") {
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                      <p className="text-[12px] text-[var(--text-main)] leading-relaxed">{b.text}</p>
                    </div>
                  );
                }

                return (
                  <p key={idx} className="text-[12px] text-[var(--text-main)] leading-relaxed">
                    {b.text}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)]">
              {t(
                "noPlanYet",
                "No plan generated yet. Click the button above to create an AI-powered plan based on your current tasks."
              )}
            </p>
          )}
        </div>

        {/* Feedback */}
        <section className="mt-8 max-w-md">
          <h2 className="text-sm font-semibold mb-1">{t("feedback.title", "Send feedback about Daily Planner")}</h2>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            {t("feedback.subtitle", "Did the plan help? Missing something? Share your thoughts so I can improve it.")}
          </p>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            {user ? (
              <FeedbackForm user={user} />
            ) : (
              <div className="text-[12px] text-[var(--text-muted)]">
                {t("feedback.guest", "Log in to send feedback tied to your account.")}{" "}
                <button
                  type="button"
                  onClick={() => gate.openGate({ title: t("feedback.guestCtaTitle", "Log in to send feedback.") })}
                  className="underline underline-offset-2 text-[var(--accent)] hover:opacity-90"
                >
                  {t("feedback.guestCta", "Log in")}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
