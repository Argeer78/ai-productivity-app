// app/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useAnalytics } from "@/lib/analytics";
import { LS_PREF_LANG } from "@/lib/translateLanguages";
import NotificationSettings from "@/app/components/NotificationSettings";
import { useTheme, type ThemeId } from "@/app/components/ThemeProvider";
import { subscribeToPush } from "@/lib/pushClient";

import { useLanguage } from "@/app/components/LanguageProvider";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { useT } from "@/lib/useT";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
type Reminder = "none" | "daily" | "weekly";

const THEME_OPTIONS: { value: ThemeId; key: string; fallback: string }[] = [
  { value: "default", key: "settings.theme.dark", fallback: "Dark (default)" },
  { value: "light", key: "settings.theme.light", fallback: "Light" },
  { value: "ocean", key: "settings.theme.ocean", fallback: "Ocean" },
  { value: "purple", key: "settings.theme.purple", fallback: "Purple" },
  { value: "forest", key: "settings.theme.forest", fallback: "Forest" },
  { value: "sunset", key: "settings.theme.sunset", fallback: "Sunset" },
  { value: "halloween", key: "settings.theme.halloween", fallback: "Halloween 🎃" },
  { value: "christmas", key: "settings.theme.christmas", fallback: "Christmas 🎄" },
  { value: "easter", key: "settings.theme.easter", fallback: "Easter 🐣" },
];

// Normalize anything like "hu-HU" -> "hu"
function normalizeLang(code: string): Lang {
  const base = (code || "en").toLowerCase().split("-")[0] as Lang;
  return (SUPPORTED_LANGS.find((l) => l.code === base)?.code ?? "en") as Lang;
}

export default function SettingsPage() {
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(key, fallback);

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

  // Onboarding-related state
  const [onboardingUseCase, setOnboardingUseCase] = useState("");
  const [onboardingWeeklyFocus, setOnboardingWeeklyFocus] = useState("");
  const [onboardingReminder, setOnboardingReminder] = useState<Reminder>("none");

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const { track } = useAnalytics();
  const { theme, setTheme } = useTheme();

  // Current app language (global)
  const { lang: appLang, setLang: setAppLang } = useLanguage();

  // ✅ Pending language selection (NOT saved until Save button)
  const [pendingLang, setPendingLang] = useState<Lang>(normalizeLang(appLang || "en"));

  // Keep pendingLang in sync if appLang changes externally
  useEffect(() => {
    setPendingLang(normalizeLang(appLang || "en"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLang]);

  type LanguageOption = { code: Lang; label: string; flag?: string };
  const languageOptions: LanguageOption[] = useMemo(
    () =>
      SUPPORTED_LANGS.map((l) => ({
        code: l.code,
        label: l.label,
        flag: l.flag,
      })),
    []
  );

  // Check existing push subscription on this device
  useEffect(() => {
    async function checkPush() {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus(
          t(
            "settings.taskReminders.notSupported",
            "Push notifications are not supported in this browser."
          )
        );
        setPushEnabled(false);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          setPushEnabled(true);
          setPushStatus(
            t(
              "settings.taskReminders.enabled",
              "✅ Push notifications enabled for this device."
            )
          );
        } else {
          setPushEnabled(false);
          setPushStatus(null);
        }
      } catch (err) {
        console.error("checkPush error:", err);
        setPushEnabled(false);
        setPushStatus(
          t(
            "settings.taskReminders.statusCheckError",
            "Could not check push notification status."
          )
        );
      }
    }

    if (user) checkPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load user
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
            onboarding_reminder,
            ui_theme,
            ui_language
          `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          if (data.ai_tone) setTone(data.ai_tone as Tone);
          if (data.focus_area) setFocusArea(data.focus_area);

          if (typeof data.daily_digest_enabled === "boolean") {
            setDailyDigestEnabled(data.daily_digest_enabled);
          }

          if (typeof data.weekly_report_enabled === "boolean") {
            setWeeklyReportEnabled(data.weekly_report_enabled);
          } else {
            setWeeklyReportEnabled(true);
          }

          setPlan(data.plan === "pro" ? "pro" : "free");

          if (data.onboarding_use_case) setOnboardingUseCase(data.onboarding_use_case);
          if (data.onboarding_weekly_focus) setOnboardingWeeklyFocus(data.onboarding_weekly_focus);
          if (data.onboarding_reminder) setOnboardingReminder(data.onboarding_reminder as Reminder);

          // ✅ Language source of truth is DB (ui_language)
          if (data.ui_language && typeof data.ui_language === "string") {
            const base = normalizeLang(data.ui_language);
            setAppLang(base);
            setPendingLang(base);
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(LS_PREF_LANG, base);
              } catch {}
            }
          } else {
            // Fallback to LS_PREF_LANG
            if (typeof window !== "undefined") {
              try {
                const lsLang = window.localStorage.getItem(LS_PREF_LANG);
                if (lsLang) {
                  const base = normalizeLang(lsLang);
                  setAppLang(base);
                  setPendingLang(base);
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError(t("settings.loadError", "Failed to load your settings."));
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user, setAppLang]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const langToSave = normalizeLang(pendingLang || "en");

      const { error } = await supabase
        .from("profiles")
        .update({
          ai_tone: tone,
          focus_area: focusArea.trim() || null,
          daily_digest_enabled: dailyDigestEnabled,
          weekly_report_enabled: weeklyReportEnabled,
          onboarding_use_case: onboardingUseCase.trim() || null,
          onboarding_weekly_focus: onboardingWeeklyFocus.trim() || null,
          onboarding_reminder: onboardingReminder || "none",
          ui_theme: theme,

          // ✅ persist language only on Save
          ui_language: langToSave,
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError(t("settings.saveError", "Failed to save settings."));
        return;
      }

      // ✅ apply globally after successful save
      setAppLang(langToSave);

      // ✅ store locally for fast boot
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LS_PREF_LANG, langToSave);
        } catch {}
      }

      setSuccess(
        t(
          "settings.saveSuccess",
          "Settings saved. Your AI will now use this style and preferences."
        )
      );
    } catch (err) {
      console.error(err);
      setError(t("settings.saveErrorGeneric", "Something went wrong while saving."));
    } finally {
      setSaving(false);
    }
  }

  async function handleEnablePush() {
    if (!user) {
      setPushStatus(t("settings.taskReminders.needsLogin", "You need to be logged in."));
      return;
    }

    setPushLoading(true);
    setPushStatus(null);

    try {
      await subscribeToPush(user.id);

      setPushEnabled(true);
      setPushStatus(
        t("settings.taskReminders.enabled", "✅ Push notifications enabled for this device.")
      );
    } catch (err: any) {
      console.error("handleEnablePush error:", err);

      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setPushStatus(
          t(
            "settings.taskReminders.blocked",
            "❌ Notifications are blocked in your browser. Please allow notifications in your browser settings."
          )
        );
      } else {
        setPushStatus(
          t("settings.taskReminders.enableError", "❌ Error enabling push notifications.") +
            (err?.message ? ` ${err.message}` : "")
        );
      }

      setPushEnabled(false);
    } finally {
      setPushLoading(false);
    }
  }

  async function handleDisablePush() {
    if (!user) {
      setPushStatus(t("settings.taskReminders.needsLogin", "You need to be logged in."));
      return;
    }

    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator)) {
      setPushStatus(
        t(
          "settings.taskReminders.serviceWorkerUnsupported",
          "Service workers are not supported in this browser."
        )
      );
      return;
    }

    setPushLoading(true);
    setPushStatus(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

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
      setPushStatus(t("settings.taskReminders.disabled", "Push notifications disabled for this device."));
    } catch (err: any) {
      console.error("handleDisablePush error:", err);
      setPushStatus(
        t("settings.taskReminders.disableError", "❌ Error disabling push notifications.") +
          (err?.message ? `: ${err.message}` : "")
      );
    } finally {
      setPushLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          {t("settings.checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">{t("settings.title", "Settings")}</h1>
          <p className="mb-4 text-center max-w-sm text-sm text-[var(--text-muted)]">
            {t("settings.loginPrompt", "Log in or create a free account to customize your AI experience.")}
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--bg-body)]"
          >
            {t("settings.goToAuth", "Go to login / signup")}
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
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("settings.title", "Settings")}</h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-6">
            {t("settings.subtitle", "Customize how the AI talks to you and what to focus on.")}
          </p>

          {loadingProfile ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("settings.loadingSettings", "Loading your settings...")}
            </p>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm"
            >
              {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
              {success && <p className="text-xs text-emerald-400 mb-2">{success}</p>}

              {/* Onboarding */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">
                    {t("settings.section.onboarding", "Onboarding & focus")}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("settings.onboarding.description", "Help the app tailor AI prompts, reminders and weekly reports.")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-[var(--text-main)]">
                    {t("settings.onboarding.mainUseLabel", "Main way you plan to use this app")}
                    <textarea
                      value={onboardingUseCase}
                      onChange={(e) => setOnboardingUseCase(e.target.value)}
                      placeholder={t(
                        "settings.onboarding.useCasePlaceholder",
                        "Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails."
                      )}
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)] resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    {t("settings.onboarding.weekGoalLabel", "One important thing you want to make progress on each week")}
                    <textarea
                      value={onboardingWeeklyFocus}
                      onChange={(e) => setOnboardingWeeklyFocus(e.target.value)}
                      placeholder={t(
                        "settings.onboarding.weekGoalPlaceholder",
                        "Example: Shipping one small improvement to my product every week."
                      )}
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)] resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    {t("settings.reminders.lightCadence", "Light reminder cadence")}
                    <select
                      value={onboardingReminder}
                      onChange={(e) => setOnboardingReminder(e.target.value as Reminder)}
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)]"
                    >
                      <option value="none">{t("settings.reminders.none", "No reminders")}</option>
                      <option value="daily">{t("settings.reminders.dailyDigest", "Daily nudge email")}</option>
                      <option value="weekly">{t("settings.reminders.weekly", "Weekly check-in")}</option>
                    </select>
                  </label>
                </div>
              </div>
              {/* AI tone */}
<div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
  <div>
    <p className="text-[11px] font-semibold text-[var(--text-main)]">
      {t("settings.aiTone.title", "AI communication style")}
    </p>
    <p className="text-[11px] text-[var(--text-muted)]">
      {t(
        "settings.aiTone.description",
        "Choose how the AI should talk to you in suggestions, reports, and messages."
      )}
    </p>
  </div>

  <div className="flex flex-wrap gap-2">
    {(
      [
        ["balanced", "⚖️ Balanced"],
        ["friendly", "😊 Friendly"],
        ["direct", "🎯 Direct"],
        ["motivational", "🔥 Motivational"],
        ["casual", "😌 Casual"],
      ] as const
    ).map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => setTone(value)}
        className={`px-3 py-1.5 rounded-full border text-[11px] transition ${
          tone === value
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
</div>

{/* Onboarding tools */}
<div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-2">
  <p className="text-xs font-semibold text-[var(--text-main)]">
    {t("settings.onboarding.toolsTitle", "Onboarding & setup")}
  </p>

  <p className="text-[11px] text-[var(--text-muted)]">
    {t(
      "settings.onboarding.toolsDesc",
      "You can re-run the onboarding wizard anytime to update your focus, reminders, and preferences."
    )}
  </p>
  <Link href={{ pathname: "/onboarding", query: { force: "1" } }}>
  Open onboarding wizard
</Link>
</div>

              {/* Weekly report */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                  {t("settings.section.weeklyReport", "WEEKLY AI REPORT")}
                </p>

                {plan !== "pro" ? (
                  <>
                    <p className="text-sm mb-1">
                      {t(
                        "settings.weeklyReport.description",
                        "Get a weekly AI-generated report with your productivity score, streak, completed tasks, and focus suggestions for next week."
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">
                      {t("settings.weeklyReport.proOnly", "This is a Pro feature. Upgrade to unlock weekly email reports.")}
                    </p>

                    <a
                      href="/dashboard#pricing"
                      className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--bg-body)]"
                    >
                      {t("settings.weeklyReport.unlockPro", "🔒 Unlock with Pro")}
                    </a>

                    <Link
                      href="/weekly-history"
                      className="block mt-2 text-[11px] text-[var(--accent)] hover:opacity-90"
                    >
                      {t("settings.weeklyReport.howItWorks", "See how weekly reports work →")}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-2">
                      {t(
                        "settings.weeklyReport.enabledDescription",
                        "Receive a weekly AI summary of your progress, wins, and what to focus on next week."
                      )}
                    </p>

                    <label className="flex items-center gap-2 text-xs mb-1">
                      <input
                        type="checkbox"
                        checked={weeklyReportEnabled}
                        onChange={(e) => setWeeklyReportEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
                      />
                      <span>
                        {t("settings.weeklyReport.toggle", "Send me weekly AI productivity reports")}
                      </span>
                    </label>
                  </>
                )}
              </div>

              {/* Daily digest */}
              <div className="pt-1 pb-2 border-b border-[var(--border-subtle)] mb-4">
                <label className="flex items-start gap-3 text-xs">
                  <input
                    type="checkbox"
                    checked={dailyDigestEnabled}
                    onChange={(e) => setDailyDigestEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
                  />
                  <span>
                    <span className="font-semibold">{t("settings.dailyDigest.title", "Daily AI email digest")}</span>
                    <br />
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {t(
                        "settings.dailyDigest.description",
                        "Once per day, AI will email you a short summary of recent notes and tasks, plus suggested next steps."
                      )}
                    </span>
                  </span>
                </label>
              </div>

              {/* Push task reminders */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-main)]">
                  {t("settings.taskReminders.title", "Task reminders (push notifications)")}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {t(
                    "settings.taskReminders.description",
                    "Enable browser notifications for task reminders. You’ll see a notification when a task you set a reminder for is due."
                  )}
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
                        ? t("settings.taskReminders.disabling", "Disabling…")
                        : t("settings.taskReminders.disable", "Disable task reminders (push)")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushLoading}
                      className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-card)] disabled:opacity-60"
                    >
                      {pushLoading
                        ? t("settings.taskReminders.enabling", "Enabling…")
                        : t("settings.taskReminders.enable", "Enable task reminders (push)")}
                    </button>
                  )}

                  {pushStatus && <p className="text-[11px] text-[var(--text-muted)]">{pushStatus}</p>}
                </div>
              </div>

              {/* Notification channels */}
              <NotificationSettings userId={user.id} />

              {/* Theme */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">
                    {t("settings.section.theme", "Theme & appearance")}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("settings.theme.description", "Choose your app theme. Seasonal themes turn on extra colors.")}
                  </p>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex flex-wrap gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTheme(opt.value)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] transition ${
                          theme === opt.value
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
                        }`}
                      >
                        {t(opt.key, opt.fallback)}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t(
                      "settings.theme.deviceNote",
                      "Your choice is saved on this device. The default theme follows a dark style; Light is easier in bright environments. Seasonal themes (Halloween, Christmas, Easter) add a bit of fun."
                    )}
                  </p>
                </div>
              </div>

              {/* ✅ Language (pending, not saved until Save) */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  {t("settings.language.title", "Language")}
                </label>

                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t(
                    "settings.language.description",
                    "This changes the app interface language and is used as the default target for the “Translate with AI” button."
                  )}
                </p>

                <select
                  value={pendingLang}
                  onChange={(e) => setPendingLang(normalizeLang(e.target.value))}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.flag ? `${opt.flag} ` : ""}
                      {opt.label ?? opt.code.toUpperCase()}
                    </option>
                  ))}
                </select>

                {pendingLang !== normalizeLang(appLang || "en") && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    {t("settings.language.pendingNote", "Language will apply after you press Save settings.")}
                  </p>
                )}
              </div>

              {/* Main focus */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  {t("settings.mainFocus.label", "Main focus area (optional)")}
                </label>

                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t(
                    "settings.mainFocus.placeholder",
                    'Example: "Work projects", "University study", "Personal growth", or leave blank.'
                  )}
                </p>

                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
                  placeholder={t(
                    "settings.mainFocus.placeholder",
                    'Example: "Work projects", "University study", "Personal growth", or leave blank.'
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-sm text-[var(--bg-body)]"
              >
                {saving ? t("settings.mainFocus.saving", "Saving...") : t("settings.mainFocus.save", "Save settings")}
              </button>

              {/* Subscription */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t(
                    "settings.subscription.manage",
                    "Manage your subscription, billing details, and invoices in the secure Stripe customer portal."
                  )}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;

                    try {
                      try {
                        track("manage_subscription_opened");
                      } catch {}

                      const res = await fetch("/api/stripe/portal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id }),
                      });

                      const data = await res.json();
                      if (data?.url) window.location.href = data.url;
                      else alert(data?.error || t("settings.subscription.portalError", "Could not open billing portal."));
                    } catch (e) {
                      console.error(e);
                      alert(t("settings.subscription.portalError", "Could not open billing portal."));
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
                >
                  {t("settings.subscription.button", "Manage subscription (Stripe)")}
                </button>
              </div>

              {/* Export */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t("settings.export.description", "You can download a copy of your notes and tasks as a Markdown file.")}
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
                      alert(t("settings.export.error", "Export failed. Please try again."));
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
                >
                  {t("settings.export.button", "Download my data (.md)")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
