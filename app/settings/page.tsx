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

import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";

import { useLanguage } from "@/app/components/LanguageProvider";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { useT } from "@/lib/useT";
import { useSound } from "@/lib/sound";
import SoundToggle from "@/app/components/SoundToggle";

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
  { value: "gold", key: "settings.theme.gold", fallback: "Luxury Gold (Pro) 🏆" },
  { value: "silver", key: "settings.theme.silver", fallback: "Sleek Silver (Pro) 🥈" },
  { value: "cyberpunk", key: "settings.theme.cyberpunk", fallback: "Cyberpunk 🦾" },
  { value: "nordic", key: "settings.theme.nordic", fallback: "Nordic ❄️" },
  { value: "midnight", key: "settings.theme.midnight", fallback: "Midnight 🌑" },
  { value: "nebula", key: "settings.theme.nebula", fallback: "Nebula (Pro) 🌌" },
  { value: "rainbow", key: "settings.theme.rainbow", fallback: "Rainbow (Pro) 🌈" },
];

const TONE_OPTIONS: { value: Tone; icon: string; key: string; fallback: string }[] = [
  { value: "balanced", icon: "⚖️", key: "settings.tone.balanced", fallback: "Balanced" },
  { value: "friendly", icon: "😊", key: "settings.tone.friendly", fallback: "Friendly" },
  { value: "direct", icon: "🎯", key: "settings.tone.direct", fallback: "Direct" },
  { value: "motivational", icon: "🔥", key: "settings.tone.motivational", fallback: "Motivational" },
  { value: "casual", icon: "😌", key: "settings.tone.casual", fallback: "Casual" },
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

  // ✅ Auth gate works with null user
  const gate = useAuthGate(user);

  const [tone, setTone] = useState<Tone>("balanced");
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const sound = useSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
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
  const [birthDate, setBirthDate] = useState("");

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const { track } = useAnalytics();
  const { theme, setTheme } = useTheme();

  // Current app language (global)
  const { lang: appLang, setLang: setAppLang } = useLanguage();

  // ✅ Pending language selection
  const [pendingLang, setPendingLang] = useState<Lang>(normalizeLang(appLang || "en"));

  // Keep pendingLang in sync if appLang changes externally
  useEffect(() => {
    setPendingLang(normalizeLang(appLang || "en"));

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

  // ✅ Load user (session-safe)
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setUser(data.session?.user ?? null);
      setCheckingUser(false);

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

  // Load sound pref
  useEffect(() => {
    setSoundEnabled(sound.isEnabled());
  }, []);

  // Check push subscription (only when logged in)
  useEffect(() => {
    async function checkPush() {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus(t("settings.taskReminders.notSupported", "Push notifications are not supported in this browser."));
        setPushEnabled(false);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          setPushEnabled(true);
          setPushStatus(t("settings.taskReminders.enabled", "✅ Push notifications enabled for this device."));
        } else {
          setPushEnabled(false);
          setPushStatus(null);
        }
      } catch (err) {
        console.error("checkPush error:", err);
        setPushEnabled(false);
        setPushStatus(t("settings.taskReminders.statusCheckError", "Could not check push notification status."));
      }
    }

    if (user?.id) checkPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load profile settings (only when logged in)
  useEffect(() => {
    if (!user?.id) return;

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

        if (error && (error as any).code !== "PGRST116") throw error;

        if (data) {
          if (data.ai_tone) setTone(data.ai_tone as Tone);
          if (data.focus_area) setFocusArea(data.focus_area);

          if (typeof data.daily_digest_enabled === "boolean") setDailyDigestEnabled(data.daily_digest_enabled);

          if (typeof data.weekly_report_enabled === "boolean") setWeeklyReportEnabled(data.weekly_report_enabled);
          else setWeeklyReportEnabled(true);

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
              } catch { }
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
  }, [user?.id, setAppLang]);

  // Load Birth Date from Metadata
  useEffect(() => {
    if (user?.user_metadata?.birth_date) {
      setBirthDate(user.user_metadata.birth_date);
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ✅ If logged out, open gate (but still allow local language apply below if you want)
    if (
      !gate.requireAuth(undefined, {
        title: t("settings.auth.title", "Log in to save Settings"),
        subtitle: t("settings.auth.subtitle", "Settings are saved to your account."),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    setSaving(true);

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
          ui_language: langToSave,
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError(t("settings.saveError", "Failed to save settings."));
        return;
      }

      // Save Birth Date to Metadata
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { birth_date: birthDate || null }
      });
      if (metaErr) console.error("Error saving birth date:", metaErr);

      setAppLang(langToSave);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LS_PREF_LANG, langToSave);
        } catch { }
      }

      setSuccess(t("settings.saveSuccess", "Settings saved. Your AI will now use this style and preferences."));
    } catch (err) {
      console.error(err);
      setError(t("settings.saveErrorGeneric", "Something went wrong while saving."));
    } finally {
      setSaving(false);
    }
  }

  async function handleEnablePush() {
    if (
      !gate.requireAuth(undefined, {
        title: t("settings.auth.pushTitle", "Log in to enable reminders"),
        subtitle: t("settings.auth.pushSubtitle", "Push reminders are tied to your account."),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    setPushLoading(true);
    setPushStatus(null);

    try {
      await subscribeToPush(user.id);
      setPushEnabled(true);
      setPushStatus(t("settings.taskReminders.enabled", "✅ Push notifications enabled for this device."));
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
    if (
      !gate.requireAuth(undefined, {
        title: t("settings.auth.pushTitle", "Log in to manage reminders"),
        subtitle: t("settings.auth.pushSubtitle", "Push reminders are tied to your account."),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setPushStatus(t("settings.taskReminders.serviceWorkerUnsupported", "Service workers are not supported in this browser."));
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
        <p className="text-sm text-[var(--text-muted)]">{t("settings.checkingSession", "Checking your session...")}</p>
      </main>
    );
  }

  const isLoggedIn = !!user?.id;

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="settings" />

      {/* ✅ Always mounted */}
      <AuthGateModal open={gate.open} onClose={gate.close} copy={gate.copy} authHref={gate.authHref} />

      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("settings.title", "Settings")}</h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-6">
            {t("settings.subtitle", "Customize how the AI talks to you and what to focus on.")}
          </p>

          {/* ✅ Guest banner (no lock) */}
          {!isLoggedIn && (
            <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-semibold mb-1">{t("settings.guest.title", "You’re browsing as a guest")}</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {t("settings.guest.subtitle", "You can view settings, but saving requires an account.")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    gate.openGate({
                      title: t("settings.auth.title", "Log in to save Settings"),
                      subtitle: t("settings.auth.subtitle", "Settings are saved to your account."),
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)]"
                >
                  {t("settings.guest.cta", "Log in / signup")}
                </button>
                {/* Open auth page button removed */}
              </div>
            </div>
          )}

          {loadingProfile && isLoggedIn ? (
            <p className="text-sm text-[var(--text-muted)]">{t("settings.loadingSettings", "Loading your settings...")}</p>
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
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)] resize-vertical"
                      rows={2}
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    {t("settings.onboarding.birthDate", "Birth Date (For Bio-Rhythm)")}
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-2 py-1.5 text-[11px] text-[var(--text-main)]"
                    />
                  </label>

                  <label className="block text-[11px] text-[var(--text-main)]">
                    {t("settings.onboarding.weekGoalLabel", "One important thing you want to make progress on each week")}
                    <textarea
                      value={onboardingWeeklyFocus}
                      onChange={(e) => setOnboardingWeeklyFocus(e.target.value)}
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
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <Link href="/onboarding?force=1" className="text-[11px] text-[var(--accent)] hover:underline">
                      {t("settings.onboarding.openWizard", "Open setup wizard again →")}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sound Effects */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-main)]">{t("settings.section.sound", "Sound Effects")}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{t("settings.sound.description", "Play subtle sounds for actions and celebrations.")}</p>
                  </div>
                  <SoundToggle />
                </div>
              </div>

              {/* AI tone */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">
                    {t("settings.tone.sectionTitle", "AI communication style")}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("settings.tone.sectionDesc", "Choose how the AI should talk to you in suggestions, reports, and messages.")}
                  </p>
                </div>

                <div className="grid gap-2">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      className={`px-3 py-2 rounded-xl border text-sm text-left ${tone === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-elevated)]"
                        }`}
                    >
                      <span className="mr-2">{opt.icon}</span>
                      {t(opt.key, opt.fallback)}
                    </button>
                  ))}
                </div>
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
                      className="inline-block text-xs px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)]"
                    >
                      {t("settings.weeklyReport.unlockPro", "🔒 Unlock with Pro")}
                    </a>
                  </>
                ) : (
                  <label className="flex items-center gap-2 text-xs mb-1">
                    <input
                      type="checkbox"
                      checked={weeklyReportEnabled}
                      onChange={(e) => setWeeklyReportEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
                    />
                    <span>{t("settings.weeklyReport.toggle", "Send me weekly AI productivity reports")}</span>
                  </label>
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

                <div className="flex items-center gap-2 flex-wrap">
                  {pushEnabled ? (
                    <button
                      type="button"
                      onClick={handleDisablePush}
                      disabled={pushLoading}
                      className="px-3 py-2 rounded-xl border border-red-400 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      {pushLoading ? t("settings.taskReminders.disabling", "Disabling…") : t("settings.taskReminders.disable", "Disable task reminders (push)")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushLoading}
                      className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-card)] disabled:opacity-60"
                    >
                      {pushLoading ? t("settings.taskReminders.enabling", "Enabling…") : t("settings.taskReminders.enable", "Enable task reminders (push)")}
                    </button>
                  )}

                  {pushStatus && <p className="text-[11px] text-[var(--text-muted)]">{pushStatus}</p>}
                </div>
              </div>

              {/* Notification channels (requires userId) */}
              {isLoggedIn ? (
                <NotificationSettings userId={user.id} />
              ) : (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">
                    {t("settings.notifications.title", "Notification channels")}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t("settings.notifications.loginNote", "Log in to manage email/push notification channels.")}
                  </p>
                </div>
              )}

              {/* Theme */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">{t("settings.section.theme", "Theme & appearance")}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{t("settings.theme.description", "Choose your app theme. Seasonal themes turn on extra colors.")}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={`px-3 py-1.5 rounded-full border text-[11px] transition ${theme === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
                        }`}
                    >
                      {t(opt.key, opt.fallback)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">{t("settings.language.title", "Language")}</label>

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

                {!isLoggedIn && (
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {t("settings.language.guestNote", "Log in to sync language to your account.")}
                  </p>
                )}
              </div>

              {/* Main focus */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  {t("settings.mainFocus.label", "Main focus area (optional)")}
                </label>
                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-sm text-[var(--accent-contrast)]"
              >
                {saving ? t("settings.mainFocus.saving", "Saving...") : t("settings.mainFocus.save", "Save settings")}
              </button>

              {/* Subscription */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t("settings.subscription.manage", "Manage your subscription, billing details, and invoices in the secure Stripe customer portal.")}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !gate.requireAuth(undefined, {
                        title: t("settings.auth.portalTitle", "Log in to manage subscription"),
                        subtitle: t("settings.auth.portalSubtitle", "Billing is linked to your account."),
                      })
                    ) {
                      return;
                    }
                    if (!user?.id) return;

                    try {
                      try {
                        track("manage_subscription_opened");
                      } catch { }

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

              {/* Reviews */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t("settings.review.description", "Enjoying the app? Your review helps us grow.")}
                </p>
                <Link
                  href="/reviews"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
                >
                  <span className="text-amber-400">★</span>
                  {t("settings.review.button", "Rate this App")}
                </Link>
              </div>

              {/* Export */}
              <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t("settings.export.description", "You can download a copy of your notes and tasks as a Markdown file.")}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !gate.requireAuth(undefined, {
                        title: t("settings.auth.exportTitle", "Log in to export your data"),
                        subtitle: t("settings.auth.exportSubtitle", "Your export is generated from your account data."),
                      })
                    ) {
                      return;
                    }
                    if (!user?.id) return;

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
