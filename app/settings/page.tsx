// app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useAnalytics } from "@/lib/analytics";
import { LANGUAGES, LS_PREF_LANG } from "@/lib/translateLanguages";
import NotificationSettings from "@/app/components/NotificationSettings";
import { useTheme, type ThemeId } from "@/app/components/ThemeProvider";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
type Reminder = "none" | "daily" | "weekly";

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "balanced", label: "Balanced (default)" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "motivational", label: "Motivational" },
  { value: "casual", label: "Casual" },
];

// Precompute unique language options once
const languageOptions = (() => {
  const seen = new Set<string>();

  return LANGUAGES.filter((lang) => {
    const key = `${lang.code}-${lang.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.label.localeCompare(b.label));
})();

// Theme options for the picker
const THEME_OPTIONS: { value: ThemeId; label: string }[] = [
  { value: "default", label: "Dark (default)" },
  { value: "light", label: "Light" },
  { value: "ocean", label: "Ocean" },
  { value: "purple", label: "Purple" },
  { value: "forest", label: "Forest" },
  { value: "sunset", label: "Sunset" },
  { value: "halloween", label: "Halloween 🎃" },
  { value: "christmas", label: "Christmas 🎄" },
  { value: "easter", label: "Easter 🐣" },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [preferredLangCode, setPreferredLangCode] = useState<string>("");

  const [tone, setTone] = useState<Tone>("balanced");
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const [focusArea, setFocusArea] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [weeklyReportEnabled, setWeeklyReportEnabled] =
    useState<boolean>(true);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  // Onboarding-related state
  const [onboardingUseCase, setOnboardingUseCase] = useState("");
  const [onboardingWeeklyFocus, setOnboardingWeeklyFocus] = useState("");
  const [onboardingReminder, setOnboardingReminder] =
    useState<Reminder>("none");

  const { track } = useAnalytics();

  // 🔹 Theme context (from ThemeProvider)
  const { theme, setTheme } = useTheme();

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

  // Load profile settings (but DO NOT override current theme — let ThemeProvider handle it)
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
            onboarding_reminder,
            ui_theme
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
            setWeeklyReportEnabled(true);
          }

          if (data.plan === "pro") {
            setPlan("pro");
          } else {
            setPlan("free");
          }

          // Onboarding fields
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

          // ⛔ Important: we do NOT call setTheme(data.ui_theme) here,
          // so the theme you pick and what's in localStorage wins.
        }

        // Preferred translation language from localStorage
        if (typeof window !== "undefined") {
          const lsLang = window.localStorage.getItem(LS_PREF_LANG);
          if (lsLang) {
            setPreferredLangCode(lsLang);
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
          onboarding_use_case: onboardingUseCase.trim() || null,
          onboarding_weekly_focus:
            onboardingWeeklyFocus.trim() || null,
          onboarding_reminder: onboardingReminder || "none",
          ui_theme: theme, // 👍 still persist for future, but we don’t force it on load
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to save settings.");
        return;
      }

      // Save preferred translation language to localStorage
      if (typeof window !== "undefined") {
        if (preferredLangCode) {
          window.localStorage.setItem(LS_PREF_LANG, preferredLangCode);
        } else {
          window.localStorage.removeItem(LS_PREF_LANG);
        }
      }

      setSuccess(
        "Settings saved. Your AI will now use this style and preferences."
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
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

              {/* Onboarding & focus card */}
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

              {/* Weekly AI report card */}
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
              <div className="pt-1 pb-2 border-b border-slate-800 mb-4">
                <label className="flex items-start gap-3 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={dailyDigestEnabled}
                    onChange={(e) =>
                      setDailyDigestEnabled(e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950"
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

              {/* Notification channels */}
              <NotificationSettings userId={user.id} />

              {/* Theme & appearance */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">
                      Theme & appearance
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Choose your app theme. Seasonal themes turn on extra colors.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex flex-wrap gap-2">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTheme(t.value)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] transition ${
                          theme === t.value
                            ? "border-indigo-400 bg-indigo-500/10 text-indigo-200"
                            : "border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-200"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Your choice is saved on this device. The default theme follows a dark
                    style; Light is easier in bright environments. Seasonal themes
                    (Halloween, Christmas, Easter) add a bit of fun.
                  </p>
                </div>
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

              {/* Preferred translation language */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preferred translation language
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Used as the default target for the “Translate with AI” button and
                  auto-translation across the app.
                </p>
                <select
                  value={preferredLangCode}
                  onChange={(e) => setPreferredLangCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Use my browser language</option>
                  {languageOptions.map((lang) => (
                    <option
                      key={`${lang.code}-${lang.label}`}
                      value={lang.code}
                    >
                      {lang.flag} {lang.label}
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
