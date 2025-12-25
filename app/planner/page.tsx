// app/planner/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useT } from "@/lib/useT";

// ✅ Auth gate
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";

export default function PlannerPage() {
  // ✅ Match keys: planner.*
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`planner.${key}`, fallback);

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // ✅ IMPORTANT: call hook with object (prevents null destructure bugs)
  const gate = useAuthGate({
    user,
    defaultCopy: {
      title: t("auth.title", "Log in to use Daily Planner."),
      subtitle: t(
        "auth.subtitle",
        "Your planner uses your saved tasks, so it needs an account."
      ),
    },
  });

  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Session bootstrap (same pattern that works elsewhere)
  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setUser(session?.user ?? null);
      setCheckingUser(false);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;
          setUser(session?.user ?? null);
        }
      );

      return () => sub.subscription.unsubscribe();
    }

    let cleanup: undefined | (() => void);
    init().then((fn) => (cleanup = fn));

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  async function generatePlan() {
    setError("");

    // ✅ Gate only when action needs auth
    const ok = gate.requireAuth(undefined, {
      title: t("auth.title", "Log in to use Daily Planner."),
      subtitle: t(
        "auth.subtitle",
        "Your planner uses your saved tasks, so it needs an account."
      ),
    });

    if (!ok) return;
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
        console.error(
          `[planner] NON-JSON response (status=${res.status}, reqId=${reqId})`,
          raw
        );
        setError(
          t(
            "error.invalidResponse",
            "Server returned an invalid response. Please try again."
          )
        );
        return;
      }

      if (!res.ok || !data?.plan) {
        console.error(
          `[planner] API error payload (status=${res.status}, reqId=${reqId})`,
          data
        );

        if (res.status === 401) {
          gate.openGate({
            title: t("error.unauthorizedTitle", "Session expired."),
            subtitle: t(
              "error.unauthorized",
              "You must be logged in to use the daily planner."
            ),
          });
          setError(
            data?.error ||
              t(
                "error.unauthorized",
                "You must be logged in to use the daily planner."
              )
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

      setPlanText(data.plan);
      // ✅ We intentionally do NOT show per-page AI usage here.
      // The header badge is the single source of truth.
    } catch (err) {
      console.error(`[planner] network/exception (reqId=${reqId})`, err);
      setError(t("error.network", "Network error while generating your plan."));
    } finally {
      setLoading(false);
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

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)]">
      <AppHeader active="planner" />

      {/* ✅ Always mounted so the button can open it */}
      <AuthGateModal
        open={gate.open}
        onClose={gate.close}
        copy={gate.copy}
        authHref={gate.authHref}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {t("title", "Daily Planner")}
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              {t("subtitle", "Let AI turn your tasks into a focused plan for today.")}
            </p>
          </div>

          <div className="text-[11px] text-[var(--text-muted)]">
            {user?.email ? (
              <>
                {t("loggedInAs", "Logged in as")}{" "}
                <span className="font-semibold">{user.email}</span>
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

        {/* Planner controls */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-4 text-sm">
          <p className="text-[12px] text-[var(--text-main)] mb-2">
            {t(
              "description",
              "This planner looks at your open tasks in the app and suggests what to focus on today. You can refresh it during the day if your priorities change."
            )}
          </p>

          <button
            onClick={generatePlan}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-xs md:text-sm"
          >
            {loading
              ? t("generatingButton", "Generating plan...")
              : t("generateButton", "Generate today’s plan")}
          </button>

          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {t(
              "generateNote",
              "Uses your daily AI limit (shared with notes, assistant, and dashboard summary)."
            )}
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

        {/* Plan output */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm min-h-[160px]">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            {t("section.todayPlan", "TODAY'S PLAN")}
          </p>

          {planText ? (
            <pre className="whitespace-pre-wrap text-[12px] text-[var(--text-main)]">
              {planText}
            </pre>
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
          <h2 className="text-sm font-semibold mb-1">
            {t("feedback.title", "Send feedback about Daily Planner")}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            {t(
              "feedback.subtitle",
              "Did the plan help? Missing something? Share your thoughts so I can improve it."
            )}
          </p>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <FeedbackForm user={user} />
          </div>
        </section>
      </div>
    </main>
  );
}
