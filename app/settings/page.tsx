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
import { subscribeToPush } from "@/lib/pushClient";

// 🧠 App UI language (LanguageProvider + i18n)
import { useLanguage } from "@/app/components/LanguageProvider";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
type Reminder = "none" | "daily" | "weekly";

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "balanced", label: "Balanced (default)" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "motivational", label: "Motivational" },
  { value: "casual", label: "Casual" },
];

// Precompute unique language options once (for translation target dropdown)
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
  const { lang, setLang } = useLanguage();

  // 🌐 Preferred translation language (for TranslateWithAIButton)
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

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const { track } = useAnalytics();

  // 🎨 Theme context (from ThemeProvider)
  const { theme, setTheme } = useTheme();

  // 🧠 App UI language context (this controls all `t()` translations)
  const { lang: appLang, setLang: setAppLang } = useLanguage();

  // Check existing push subscription on this device
  useEffect(() => {
    async function checkPush() {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("Push notifications are not supported in this browser.");
        setPushEnabled(false);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          setPushEnabled(true);
          setPushStatus("✅ Push notifications enabled for this device.");
        } else {
          setPushEnabled(false);
          setPushStatus(null); // no message until user interacts
        }
      } catch (err) {
        console.error("checkPush error:", err);
        setPushEnabled(false);
        setPushStatus("Could not check push notification status.");
      }
    }

    if (user) {
      checkPush();
    }
  }, [user]);

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

          // We do NOT call setTheme(data.ui_theme) here,
          // so the theme you pick and what's in localStorage wins.
        }

        // Preferred translation language from localStorage
                if (typeof window !== "undefined") {
          const lsLang = window.localStorage.getItem(LS_PREF_LANG);
          if (lsLang) {
            setPreferredLangCode(lsLang);

            const base = lsLang.split("-")[0];
            const supported = SUPPORTED_LANGS.find(
              (entry) => entry.code === base
            );
            if (supported) {
              setLang(base as Lang);
            }
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
          ui_theme: theme, // still persist for future, but we don’t force it on load
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to save settings.");
        return;
      }

            // Save preferred translation language to localStorage + sync UI language
      if (typeof window !== "undefined") {
        if (preferredLangCode) {
          window.localStorage.setItem(LS_PREF_LANG, preferredLangCode);

          const base = preferredLangCode.split("-")[0];
          const supported = SUPPORTED_LANGS.find(
            (entry) => entry.code === base
          );
          if (supported) {
            setLang(base as Lang);
          }
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

  // Enable browser push notifications for tasks
  async function handleEnablePush() {
    if (!user) {
      setPushStatus("You need to be logged in.");
      return;
    }

    setPushLoading(true);
    setPushStatus(null);

    try {
      // This will throw if anything goes wrong
      await subscribeToPush(user.id);

      setPushEnabled(true);
      setPushStatus("✅ Push notifications enabled for this device.");
    } catch (err: any) {
      console.error("handleEnablePush error:", err);

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "denied"
      ) {
        setPushStatus(
          "❌ Notifications are blocked in your browser. Please allow notifications in your browser settings."
        );
      } else {
        setPushStatus(
          `❌ Error enabling push notifications${
            err?.message ? `: ${err.message}` : ""
          }`
        );
      }

      setPushEnabled(false);
    } finally {
      setPushLoading(false);
    }
  }

  // Disable push notifications for this device
  async function handleDisablePush() {
    if (!user) {
      setPushStatus("You need to be logged in.");
      return;
    }

    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setPushStatus("Service workers are not supported in this browser.");
      return;
    }

    setPushLoading(true);
    setPushStatus(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
      }

      // Optionally also remove from DB for this user
      try {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
      } catch (e) {
        console.warn("push/unsubscribe API error (non-fatal):", e);
      }

      setPushEnabled(false);
      setPushStatus("Push notifications disabled for this device.");
    } catch (err: any) {
      console.error("handleDisablePush error:", err);
      setPushStatus(
        `❌ Error disabling push notifications${
          err?.message ? `: ${err.message}` : ""
        }`
      );
    } finally {
      setPushLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Settings</h1>
          <p className="mb-4 text-center max-w-sm text-sm text-[var(--text-muted)]">
            Log in or create a free account to customize your AI experience.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--bg-body)]"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="settings" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Settings</h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-6">
            Customize how the AI talks to you and what to focus on.
          </p>

          {loadingProfile ? (
            <p className="text-sm text-[var(--text-muted)]">
              Loading your settings...
            </p>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm"
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
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-main)]">
                      Onboarding & focus
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Help the app tailor AI prompts, reminders and weekly reports.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-[var(--text-main)]">
                    Main way you plan to use this app
                    <textarea
                      value={onboardingUseCase}
                      onChange={(e) =>
                        setOnboardingUseCase(e.target.value)
                      }
                      placeholder="Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails."
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)] resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    One important thing you want to make progress on each week
                    <textarea
                      value={onboardingWeeklyFocus}
                      onChange={(e) =>
                        setOnboardingWeeklyFocus(e.target.value)
                      }
                      placeholder="Example: Shipping one small improvement to my product every week."
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)] resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    Light reminder cadence
                    <select
                      value={onboardingReminder}
                      onChange={(e) =>
                        setOnboardingReminder(
                          e.target.value as Reminder
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)]"
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
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    WEEKLY AI REPORT
                  </p>
                  {plan !== "pro" ? (
                    <>
                      <p className="text-sm mb-1">
                        Get a weekly AI-generated report with your productivity score,
                        streak, completed tasks, and focus suggestions for next week.
                      </p>

                      <p className="text-[11px] text-[var(--text-muted)] mb-3">
                        This is a Pro feature. Upgrade to unlock weekly email reports.
                      </p>
                      <a
                        href="/dashboard#pricing"
                        className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--bg-body)]"
                      >
                        🔒 Unlock with Pro
                      </a>
                      <Link
                        href="/weekly-history"
                        className="block mt-2 text-[11px] text-[var(--accent)] hover:opacity-90"
                      >
                        See how weekly reports work →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm mb-2">
                        Receive a weekly AI summary of your progress, wins, and what to
                        focus on next week.
                      </p>
                      <label className="flex items-center gap-2 text-xs mb-1">
                        <input
                          type="checkbox"
                          checked={weeklyReportEnabled}
                          onChange={(e) =>
                            setWeeklyReportEnabled(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
                        />
                        <span>Send me weekly AI productivity reports</span>
                      </label>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Weekly reports use your scores, tasks, notes & goals to give you a
                        simple “how did I do?” email every week.
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Emails are sent once per week and include your streak, average
                        score, and tailored suggestions.
                      </p>
                      <Link
                        href="/weekly-history"
                        className="inline-block mt-2 text-[11px] text-[var(--accent)] hover:opacity-90"
                      >
                        View past weekly reports →
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Daily digest toggle */}
              <div className="pt-1 pb-2 border-b border-[var(--border-subtle)] mb-4">
                <label className="flex items-start gap-3 text-xs">
                  <input
                    type="checkbox"
                    checked={dailyDigestEnabled}
                    onChange={(e) =>
                      setDailyDigestEnabled(e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
                  />
                  <span>
                    <span className="font-semibold">
                      Daily AI email digest
                    </span>
                    <br />
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Once per day, AI will email you a short summary of recent notes
                      and tasks, plus suggested next steps.
                    </span>
                  </span>
                </label>
              </div>

              {/* Browser push notifications for tasks */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-main)]">
                  Task reminders (push notifications)
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enable browser notifications for task reminders. You’ll see a
                  notification when a task you set a reminder for is due.
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {pushEnabled ? (
                    <button
                      type="button"
                      onClick={handleDisablePush}
                      disabled={pushLoading}
                      className="px-3 py-2 rounded-xl border border-red-400 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      {pushLoading
                        ? "Disabling…"
                        : "Disable task reminders (push)"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushLoading}
                      className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-card)] disabled:opacity-60"
                    >
                      {pushLoading
                        ? "Enabling…"
                        : "Enable task reminders (push)"}
                    </button>
                  )}

                  {pushStatus && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {pushStatus}
                    </p>
                  )}
                </div>
              </div>

              {/* Notification channels */}
              <NotificationSettings userId={user.id} />

              {/* Theme & appearance */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-main)]">
                      Theme & appearance
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
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
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    Your choice is saved on this device. The default theme follows a dark
                    style; Light is easier in bright environments. Seasonal themes
                    (Halloween, Christmas, Easter) add a bit of fun.
                  </p>
                </div>
              </div>

              {/* 🌐 App UI language */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  App language
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  This changes the language of menus, navigation, and built-in texts.
                </p>
                <select
                  value={appLang}
                  onChange={(e) => setAppLang(e.target.value as Lang)}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
                >
                  {SUPPORTED_LANGS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label ?? opt.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred translation language */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Preferred translation language
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Used as the default target for the “Translate with AI” button and
                  auto-translation across the app.
                </p>
                <select
                  value={preferredLangCode}
                  onChange={(e) => setPreferredLangCode(e.target.value)}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
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
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Main focus area (optional)
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Example: &quot;Work projects&quot;, &quot;University
                  study&quot;, &quot;Personal growth&quot;, or leave blank.
                </p>
                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
                  placeholder="e.g. Work projects, university, personal life..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-sm text-[var(--bg-body)]"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>

              {/* Manage subscription (Stripe Portal) */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
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
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
                >
                  Manage subscription (Stripe)
                </button>
              </div>

              {/* Export data */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
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
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
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
