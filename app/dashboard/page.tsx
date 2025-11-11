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

  // derive daily limit from plan
  const dailyLimit =
    plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

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

  // 2) Ensure profile exists & load plan + AI usage
  useEffect(() => {
    if (!user) {
      setPlan("free");
      setAiCountToday(0);
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
          .select("count")
          .eq("user_id", user.id)
          .eq("usage_date", today)
          .maybeSingle();

        if (usageError && usageError.code !== "PGRST116") {
          throw usageError;
        }

        setAiCountToday(usage?.count || 0);
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
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Quick overview of your plan and AI usage.
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
                This includes notes AI, the global assistant, and the summary.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60">
                Plan:{" "}
                <span className="font-semibold">{plan.toUpperCase()}</span>
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
                  Uses your daily AI limit (shared with notes & assistant).
                </p>
              </div>
            </div>
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
