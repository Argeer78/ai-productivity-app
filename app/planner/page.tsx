"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function PlannerPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiInfo, setAiInfo] = useState<{ usedToday: number; dailyLimit: number } | null>(null);

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
      if (typeof data.usedToday === "number" && typeof data.dailyLimit === "number") {
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
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">Daily Planner</h1>
        <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
          Log in or create a free account to generate an AI-powered daily plan.
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
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
          <Link
            href="/dashboard"
            className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-xs sm:text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Daily Planner
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Let AI turn your tasks into a focused plan for today.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4 text-sm">
          <p className="text-[12px] text-slate-300 mb-2">
            This planner looks at your open tasks in the app and suggests what
            to focus on today. You can refresh it during the day if your
            priorities change.
          </p>
          <button
            onClick={generatePlan}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs md:text-sm"
          >
            {loading ? "Generating plan..." : "Generate today’s plan"}
          </button>
          <p className="mt-1 text-[11px] text-slate-500">
            Uses your daily AI limit (shared with notes, assistant, and
            dashboard summary).
          </p>
          {aiInfo && (
            <p className="mt-1 text-[11px] text-slate-500">
              AI usage today:{" "}
              <span className="font-semibold">
                {aiInfo.usedToday}/{aiInfo.dailyLimit}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-400">{error}</div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm min-h-[160px]">
          <p className="text-xs font-semibold text-slate-400 mb-2">
            TODAY&apos;S PLAN
          </p>
          {planText ? (
            <pre className="whitespace-pre-wrap text-[12px] text-slate-100">
              {planText}
            </pre>
          ) : (
            <p className="text-[12px] text-slate-400">
              No plan generated yet. Click the button above to create an
              AI-powered plan based on your current tasks.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
