// app/planner/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";

type AiInfo = {
  usedToday: number;
  dailyLimit: number;
};

export default function PlannerPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiInfo, setAiInfo] = useState<AiInfo | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[planner] getUser error", error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[planner] getUser exception", err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  async function generatePlan() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const text = await res.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from /api/daily-plan:", text);
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.plan) {
        console.error("Daily plan error payload:", data);
        if (res.status === 429) {
          setError(
            data.error ||
              "You’ve reached today’s AI limit for your plan. Try again tomorrow or upgrade to Pro."
          );
        } else {
          setError(data.error || "Failed to generate daily plan.");
        }
        setLoading(false);
        return;
      }

      setPlanText(data.plan);

      if (
        typeof data.usedToday === "number" &&
        typeof data.dailyLimit === "number"
      ) {
        setAiInfo({
          usedToday: data.usedToday,
          dailyLimit: data.dailyLimit,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Network error while generating your plan.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="planner" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Daily Planner</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to generate an AI-powered daily
            plan.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)]">
      <AppHeader active="planner" />

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Daily Planner
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              Let AI turn your tasks into a focused plan for today.
            </p>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Logged in as{" "}
            <span className="font-semibold">{user.email ?? "you"}</span>
          </div>
        </div>

        {/* Planner controls */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-4 text-sm">
          <p className="text-[12px] text-[var(--text-main)] mb-2">
            This planner looks at your open tasks in the app and suggests what
            to focus on today. You can refresh it during the day if your
            priorities change.
          </p>

          <button
            onClick={generatePlan}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-xs md:text-sm"
          >
            {loading ? "Generating plan..." : "Generate today’s plan"}
          </button>

          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Uses your daily AI limit (shared with notes, assistant, and
            dashboard summary).
          </p>

          {aiInfo && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              AI usage today:{" "}
              <span className="font-semibold">
                {aiInfo.usedToday}/{aiInfo.dailyLimit}
              </span>
            </p>
          )}

          {error && (
            <div className="mt-3 text-[11px] text-red-400">{error}</div>
          )}

          <div className="mt-3 text-[11px] text-[var(--text-muted)] flex gap-3 flex-wrap">
            <Link href="/tasks" className="hover:text-[var(--accent)]">
              → View & edit your tasks
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--accent)]">
              Open Dashboard
            </Link>
          </div>
        </div>

        {/* Plan output */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm min-h-[160px]">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            TODAY&apos;S PLAN
          </p>
          {planText ? (
            <pre className="whitespace-pre-wrap text-[12px] text-[var(--text-main)]">
              {planText}
            </pre>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)]">
              No plan generated yet. Click the button above to create an
              AI-powered plan based on your current tasks.
            </p>
          )}
        </div>

        {/* Feedback */}
        <section className="mt-8 max-w-md">
          <h2 className="text-sm font-semibold mb-1">
            Send feedback about Daily Planner
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            Did the plan help? Missing something? Share your thoughts so I can
            improve it.
          </p>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <FeedbackForm user={user} />
          </div>
        </section>
      </div>
    </main>
  );
}
