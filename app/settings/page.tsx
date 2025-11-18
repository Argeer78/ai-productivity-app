"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import Link from "next/link";
import { useAnalytics } from "@/lib/analytics";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
type Reminder = "none" | "daily" | "weekly";

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "balanced", label: "Balanced (default)" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "motivational", label: "Motivational" },
  { value: "casual", label: "Casual" },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tone, setTone] = useState<Tone>("balanced");
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const [focusArea, setFocusArea] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState<boolean>(true);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState("");

  // NEW: onboarding-related state
  const [onboardingUseCase, setOnboardingUseCase] = useState("");
  const [onboardingWeeklyFocus, setOnboardingWeeklyFocus] = useState("");
  const [onboardingReminder, setOnboardingReminder] =
    useState<Reminder>("none");

  const { track } = useAnalytics();

  // Load user
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

  // Load profile settings
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      setLoadingProfile(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            ai_tone,
            weekly_report_enabled,
            focus_area,
            daily_digest_enabled,
            daily_digest_hour,
            plan,
            onboarding_use_case,
            onboarding_weekly_focus,
            onboarding_reminder
          `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          if (data.ai_tone) {
            setTone(data.ai_tone as Tone);
          }
          if (data.focus_area) {
            setFocusArea(data.focus_area);
          }
          if (typeof data.daily_digest_enabled === "boolean") {
            setDailyDigestEnabled(data.daily_digest_enabled);
          }

          if (typeof data.weekly_report_enabled === "boolean") {
            setWeeklyReportEnabled(data.weekly_report_enabled);
          } else {
            setWeeklyReportEnabled(true); // default if null/undefined
          }

          if (data.plan === "pro") {
            setPlan("pro");
          } else {
            setPlan("free");
          }

          // NEW: onboarding fields
          if (data.onboarding_use_case) {
            setOnboardingUseCase(data.onboarding_use_case);
          }
          if (data.onboarding_weekly_focus) {
            setOnboardingWeeklyFocus(data.onboarding_weekly_focus);
          }
          if (data.onboarding_reminder) {
            setOnboardingReminder(
              data.onboarding_reminder as Reminder
            );
          }
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load your settings.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ai_tone: tone,
          focus_area: focusArea.trim() || null,
          daily_digest_enabled: dailyDigestEnabled,
          weekly_report_enabled: weeklyReportEnabled,

          // NEW: onboarding fields
          onboarding_use_case: onboardingUseCase.trim() || null,
          onboarding_weekly_focus:
            onboardingWeeklyFocus.trim() || null,
          onboarding_reminder: onboardingReminder || "none",
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to save settings.");
        return;
      }

      setSuccess("Settings saved. Your AI will now use this style and preferences.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail() {
    if (!user?.email) {
      setTestEmailMessage("No email found on your profile.");
      return;
    }

    setTestingEmail(true);
    setTestEmailMessage("");

    try {
      // Analytics (non-critical)
      try {
        track("test_email_clicked");
      } catch {
        // ignore analytics failures
      }

      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        setTestEmailMessage(
          data?.error || "Failed to send test email. Please try again."
        );
      } else {
        setTestEmailMessage(
          "Test email sent. Check your inbox (and spam folder)."
        );
      }
    } catch (err) {
      console.error(err);
      setTestEmailMessage("Network error while sending test email.");
    } finally {
      setTestingEmail(false);
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
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Settings</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to customize your AI experience.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="settings" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Settings</h1>
          <p className="text-xs md:text-sm text-slate-400 mb-6">
            Customize how the AI talks to you and what to focus on.
          </p>

          {loadingProfile ? (
            <p className="text-slate-300 text-sm">Loading your settings...</p>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
            >
              {error && (
                <p className="text-xs text-red-400 mb-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-400 mb-2">
                  {success}
                </p>
              )}

              {/* Onboarding & focus card (NEW) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">
                      Onboarding & focus
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Help the app tailor AI prompts, reminders and weekly reports.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-slate-300">
                    Main way you plan to use this app
                    <textarea
                      value={onboardingUseCase}
                      onChange={(e) =>
                        setOnboardingUseCase(e.target.value)
                      }
                      placeholder="Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails."
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-slate-300">
                    One important thing you want to make progress on each week
                    <textarea
                      value={onboardingWeeklyFocus}
                      onChange={(e) =>
                        setOnboardingWeeklyFocus(e.target.value)
                      }
                      placeholder="Example: Shipping one small improvement to my product every week."
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-slate-300">
                    Light reminder cadence
                    <select
                      value={onboardingReminder}
                      onChange={(e) =>
                        setOnboardingReminder(
                          e.target.value as Reminder
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100"
                    >
                      <option value="none">No reminders</option>
                      <option value="daily">Daily nudge email</option>
                      <option value="weekly">Weekly check-in</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Weekly AI report card (your existing grid) */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    WEEKLY AI REPORT
                  </p>
                  {plan !== "pro" ? (
                    <>
                      <p className="text-sm text-slate-200 mb-1">
                        Get a weekly AI-generated report with your productivity score,
                        streak, completed tasks, and focus suggestions for next week.
                      </p>

                      <p className="text-[11px] text-slate-500 mb-3">
                        This is a Pro feature. Upgrade to unlock weekly email reports.
                      </p>
                      <a
                        href="/dashboard#pricing"
                        className="inline-block text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-50"
                      >
                        🔒 Unlock with Pro
                      </a>
                      <Link
                        href="/weekly-history"
                        className="block mt-2 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        See how weekly reports work →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-200 mb-2">
                        Receive a weekly AI summary of your progress, wins, and what to
                        focus on next week.
                      </p>
                      <label className="flex items-center gap-2 text-xs text-slate-200 mb-1">
                        <input
                          type="checkbox"
                          checked={weeklyReportEnabled}
                          onChange={(e) =>
                            setWeeklyReportEnabled(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                        />
                        <span>Send me weekly AI productivity reports</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Weekly reports use your scores, tasks, notes & goals to give you a
                        simple “how did I do?” email every week.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Emails are sent once per week and include your streak, average
                        score, and tailored suggestions.
                      </p>
                      <Link
                        href="/weekly-history"
                        className="inline-block mt-2 text-[11px] text-indigo-400 hover:text-indigo-300"
                      >
                        View past weekly reports →
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Daily digest toggle */}
              <div className="pt-1 pb-2 border-b border-slate-800 mb-2">
                <label className="flex items-start gap-3 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={dailyDigestEnabled}
                    onChange={(e) =>
                      setDailyDigestEnabled(e.target.checked)
                    }
                    className="mt-[2px] h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  <span>
                    <span className="font-semibold">
                      Daily AI email digest
                    </span>
                    <br />
                    <span className="text-[11px] text-slate-400">
                      Once per day, AI will email you a short summary of
                      recent notes and tasks, plus suggested next steps.
                    </span>
                  </span>
                </label>
              </div>

              {/* AI tone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  AI tone
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  This affects the assistant, templates, and planner tone.
                </p>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Focus area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Main focus area (optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Example: &quot;Work projects&quot;, &quot;University
                  study&quot;, &quot;Personal growth&quot;, or leave blank.
                </p>
                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. Work projects, university, personal life..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>

              {/* Test email button */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <p className="text-[11px] text-slate-400 mb-2">
                  Send yourself a quick test email to confirm that email
                  delivery from AI Productivity Hub is working.
                </p>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testingEmail}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm disabled:opacity-60"
                >
                  {testingEmail ? "Sending..." : "Send test email"}
                </button>
                {testEmailMessage && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {testEmailMessage}
                  </p>
                )}
              </div>

              {/* Manage subscription (Stripe Portal) */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <p className="text-[11px] text-slate-400 mb-2">
                  Manage your subscription, billing details, and invoices in
                  the secure Stripe customer portal.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      try {
                        track("manage_subscription_opened");
                      } catch {
                        // ignore analytics errors
                      }

                      const res = await fetch("/api/stripe/portal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      const data = await res.json();
                      if (data?.url) {
                        window.location.href = data.url;
                      } else {
                        alert(
                          data?.error ||
                            "Could not open billing portal."
                        );
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Could not open billing portal.");
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
                >
                  Manage subscription (Stripe)
                </button>
              </div>

              {/* Export data */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <p className="text-[11px] text-slate-400 mb-2">
                  You can download a copy of your notes and tasks as a
                  Markdown file.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const res = await fetch("/api/export", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "ai_productivity_export.md";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error(e);
                      alert("Export failed. Please try again.");
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
                >
                  Download my data (.md)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
