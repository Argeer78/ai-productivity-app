"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useTheme, type ThemeId } from "@/app/components/ThemeProvider";
import { subscribeToPush } from "@/lib/pushClient";
import { useT } from "@/lib/useT";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
type Reminder = "none" | "daily" | "weekly";

type ProfileDraft = {
  onboarding_use_case: string;
  onboarding_weekly_focus: string;
  onboarding_reminder: Reminder;
  ai_tone: Tone;
  focus_area: string;
  weekly_report_enabled: boolean;
  daily_digest_enabled: boolean;
  ui_theme: ThemeId;
};

type StepId =
  | "welcome"
  | "theme"
  | "useCase"
  | "weeklyFocus"
  | "reminders"
  | "aiStyle"
  | "push"
  | "finish";

const STEPS: StepId[] = [
  "welcome",
  "theme",
  "useCase",
  "weeklyFocus",
  "reminders",
  "aiStyle",
  "push",
  "finish",
];

const THEME_OPTIONS: { value: ThemeId; labelKey: string; fallback: string }[] = [
  { value: "default", labelKey: "settings.theme.dark", fallback: "Dark (default)" },
  { value: "light", labelKey: "settings.theme.light", fallback: "Light" },
  { value: "ocean", labelKey: "settings.theme.ocean", fallback: "Ocean" },
  { value: "purple", labelKey: "settings.theme.purple", fallback: "Purple" },
  { value: "forest", labelKey: "settings.theme.forest", fallback: "Forest" },
  { value: "sunset", labelKey: "settings.theme.sunset", fallback: "Sunset" },
  { value: "halloween", labelKey: "settings.theme.halloween", fallback: "Halloween 🎃" },
  { value: "christmas", labelKey: "settings.theme.christmas", fallback: "Christmas 🎄" },
  { value: "easter", labelKey: "settings.theme.easter", fallback: "Easter 🐣" },
];

function clampStep(i: number) {
  return Math.max(0, Math.min(i, STEPS.length - 1));
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(key, fallback);

  const { theme, setTheme } = useTheme();

  const [userId, setUserId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushChecking, setPushChecking] = useState(true);
  const [pushError, setPushError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    onboarding_use_case: "",
    onboarding_weekly_focus: "",
    onboarding_reminder: "none",
    ai_tone: "balanced",
    focus_area: "",
    weekly_report_enabled: true,
    daily_digest_enabled: false,
    ui_theme: theme as ThemeId,
  });

  const step = STEPS[stepIndex];

  // Load user + profile defaults once
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingProfile(true);

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (!cancelled) setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          `
          onboarding_use_case,
          onboarding_weekly_focus,
          onboarding_reminder,
          ai_tone,
          focus_area,
          weekly_report_enabled,
          daily_digest_enabled,
          ui_theme
        `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) console.error("[onboarding] load profile error", error);

      if (!cancelled && profile) {
        const uiTheme = (profile.ui_theme as ThemeId) || (theme as ThemeId);

        setDraft((d) => ({
          ...d,
          onboarding_use_case: profile.onboarding_use_case || "",
          onboarding_weekly_focus: profile.onboarding_weekly_focus || "",
          onboarding_reminder: (profile.onboarding_reminder as Reminder) || "none",
          ai_tone: (profile.ai_tone as Tone) || "balanced",
          focus_area: profile.focus_area || "",
          weekly_report_enabled:
            typeof profile.weekly_report_enabled === "boolean"
              ? profile.weekly_report_enabled
              : true,
          daily_digest_enabled:
            typeof profile.daily_digest_enabled === "boolean"
              ? profile.daily_digest_enabled
              : false,
          ui_theme: uiTheme,
        }));

        // Apply theme immediately (nice UX)
        setTheme(uiTheme);
      }

      if (!cancelled) setLoadingProfile(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePartial(patch: Partial<ProfileDraft>) {
    if (!userId) return;

    setSaving(true);
    setSaveError("");

    try {
      const payload: any = { ...patch };

      // Keep DB columns aligned
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);

      if (error) {
        console.error("[onboarding] save error", error);
        setSaveError(t("onboarding.error.save", "Could not save. Please try again."));
        return false;
      }
      return true;
    } catch (e) {
      console.error("[onboarding] save exception", e);
      setSaveError(t("onboarding.error.save", "Could not save. Please try again."));
      return false;
    } finally {
      setSaving(false);
    }
  }
// Check push notification status on mount
useEffect(() => {
  let cancelled = false;

  async function checkPushStatus() {
    try {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (!cancelled) setPushEnabled(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (!cancelled) {
        setPushEnabled(!!sub);
      }
    } catch (err) {
      console.error("[onboarding] check push error", err);
      if (!cancelled) setPushEnabled(false);
    } finally {
      if (!cancelled) setPushChecking(false);
    }
  }

  checkPushStatus();

  return () => {
    cancelled = true;
  };
}, []);

  async function next() {
    // Save the important step data on step transitions (fast, reliable)
    if (step === "theme") {
      await savePartial({ ui_theme: draft.ui_theme });
    }
    if (step === "useCase") {
      await savePartial({ onboarding_use_case: draft.onboarding_use_case.trim() });
    }
    if (step === "weeklyFocus") {
      await savePartial({ onboarding_weekly_focus: draft.onboarding_weekly_focus.trim() });
    }
    if (step === "reminders") {
      await savePartial({
        onboarding_reminder: draft.onboarding_reminder,
        weekly_report_enabled: draft.weekly_report_enabled,
        daily_digest_enabled: draft.daily_digest_enabled,
      });
    }
    if (step === "aiStyle") {
      await savePartial({
        ai_tone: draft.ai_tone,
        focus_area: draft.focus_area.trim() || null,
      } as any);
    }

    setStepIndex((i) => clampStep(i + 1));
  }

  function back() {
    setStepIndex((i) => clampStep(i - 1));
  }

  async function skipForever() {
    if (!userId) return;

    setSaving(true);
    setSaveError("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);

      if (error) throw error;

      router.replace("/dashboard");
    } catch (e) {
      console.error("[onboarding] skip error", e);
      setSaveError(t("onboarding.error.save", "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!userId) return;

    setSaving(true);
    setSaveError("");

    try {
      // Final save to ensure everything is persisted
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_use_case: draft.onboarding_use_case.trim() || null,
          onboarding_weekly_focus: draft.onboarding_weekly_focus.trim() || null,
          onboarding_reminder: draft.onboarding_reminder,
          ai_tone: draft.ai_tone,
          focus_area: draft.focus_area.trim() || null,
          weekly_report_enabled: draft.weekly_report_enabled,
          daily_digest_enabled: draft.daily_digest_enabled,
          ui_theme: draft.ui_theme,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (error) throw error;

      router.replace("/dashboard");
    } catch (e) {
      console.error("[onboarding] finish error", e);
      setSaveError(t("onboarding.error.save", "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
  if (!userId) return;

  setPushLoading(true);
  setPushStatus(null);
  setPushError(null);

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    // ✅ Already enabled → just reflect state
    if (existing) {
      setPushEnabled(true);
      setPushStatus(
        t("settings.taskReminders.enabled", "✅ Push notifications enabled for this device.")
      );
      return;
    }

    // ❌ Not enabled → actually subscribe
    await subscribeToPush(userId);
    setPushEnabled(true);
    setPushStatus(
      t("settings.taskReminders.enabled", "✅ Push notifications enabled for this device.")
    );
  } catch (err: any) {
    console.error("[onboarding] enablePush error:", err);

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
  } finally {
    setPushLoading(false);
  }
}

  const progressLabel = useMemo(() => {
    return t(
      "onboarding.progress",
      `Step ${stepIndex + 1} of ${STEPS.length}`
    ).replace("{current}", String(stepIndex + 1)).replace("{total}", String(STEPS.length));
  }, [stepIndex, t]);

  if (loadingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] text-[var(--text-main)]">
        <p className="text-sm text-[var(--text-muted)]">Loading setup…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[11px] text-[var(--text-muted)]">{progressLabel}</p>

          <button
            type="button"
            onClick={skipForever}
            disabled={saving}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            {t("onboarding.skip", "Skip setup")}
          </button>
        </div>

        {saveError && (
          <div className="mb-3 text-[11px] text-red-400">{saveError}</div>
        )}

        {/* Steps */}
        {step === "welcome" && (
          <>
            <h1 className="text-2xl font-bold mb-2">
              {t("onboarding.welcome.title", "Welcome 👋")}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {t(
                "onboarding.welcome.subtitle",
                "Let’s personalize the app so the AI, reminders and reports fit how you work. Takes about 1 minute."
              )}
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={next}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
              >
                {t("onboarding.start", "Get started")}
              </button>
            </div>
          </>
        )}

        {step === "theme" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {t("onboarding.theme.title", "Choose a theme")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t(
                "onboarding.theme.subtitle",
                "Pick the look you like. You can change it anytime in Settings."
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setDraft((d) => ({ ...d, ui_theme: opt.value }));
                    setTheme(opt.value);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-[11px] transition ${
                    draft.ui_theme === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {t(opt.labelKey, opt.fallback)}
                </button>
              ))}
            </div>

            <NavRow back={back} next={next} saving={saving} />
          </>
        )}

        {step === "useCase" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {t("onboarding.useCase.title", "Main way you’ll use this app")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t(
                "onboarding.useCase.subtitle",
                "This helps tailor AI prompts and suggestions to your real needs."
              )}
            </p>

            <textarea
              value={draft.onboarding_use_case}
              onChange={(e) =>
                setDraft((d) => ({ ...d, onboarding_use_case: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 py-2 text-sm"
              placeholder={t(
                "settings.onboarding.useCasePlaceholder",
                "Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails."
              )}
            />

            <NavRow back={back} next={next} saving={saving} />
          </>
        )}

        {step === "weeklyFocus" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {t("onboarding.weeklyFocus.title", "Weekly focus")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t(
                "onboarding.weeklyFocus.subtitle",
                "What’s one important thing you want to move forward each week?"
              )}
            </p>

            <textarea
              value={draft.onboarding_weekly_focus}
              onChange={(e) =>
                setDraft((d) => ({ ...d, onboarding_weekly_focus: e.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 py-2 text-sm"
              placeholder={t(
                "settings.onboarding.weekGoalPlaceholder",
                "Example: Shipping one small improvement to my product every week."
              )}
            />

            <NavRow back={back} next={next} saving={saving} />
          </>
        )}

        {step === "reminders" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {t("onboarding.reminders.title", "Reminders & reports")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t(
                "onboarding.reminders.subtitle",
                "Choose how often you want light nudges. You can change this anytime."
              )}
            </p>

            <label className="block text-[12px] mb-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                {t("settings.reminders.lightCadence", "Light reminder cadence")}
              </span>
              <select
                value={draft.onboarding_reminder}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, onboarding_reminder: e.target.value as Reminder }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 py-2 text-sm"
              >
                <option value="none">{t("settings.reminders.none", "No reminders")}</option>
                <option value="daily">{t("settings.reminders.dailyDigest", "Daily nudge email")}</option>
                <option value="weekly">{t("settings.reminders.weekly", "Weekly check-in")}</option>
              </select>
            </label>

            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.weekly_report_enabled}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, weekly_report_enabled: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <span>{t("settings.weeklyReport.toggle", "Send me weekly AI productivity reports")}</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.daily_digest_enabled}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, daily_digest_enabled: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <span>{t("settings.dailyDigest.title", "Daily AI email digest")}</span>
              </label>
            </div>

            <NavRow back={back} next={next} saving={saving} />
          </>
        )}

        {step === "aiStyle" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {t("onboarding.aiStyle.title", "AI style & focus")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t(
                "onboarding.aiStyle.subtitle",
                "Choose how the AI talks, and optionally set a main focus area."
              )}
            </p>

            <div className="grid gap-2 mb-4">
              {(
                [
                  ["balanced", t("settings.tone.balanced", "Balanced")] as const,
                  ["friendly", t("settings.tone.friendly", "Friendly")] as const,
                  ["direct", t("settings.tone.direct", "Direct")] as const,
                  ["motivational", t("settings.tone.motivational", "Motivational")] as const,
                  ["casual", t("settings.tone.casual", "Casual")] as const,
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, ai_tone: val }))}
                  className={`px-3 py-2 rounded-xl border text-sm text-left ${
                    draft.ai_tone === val
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-body)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-sm">
              <span className="text-[11px] text-[var(--text-muted)]">
                {t("settings.mainFocus.label", "Main focus area (optional)")}
              </span>
              <input
                value={draft.focus_area}
                onChange={(e) => setDraft((d) => ({ ...d, focus_area: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 py-2 text-sm"
                placeholder={t(
                  "settings.mainFocus.placeholder",
                  'Example: "Work projects", "University study", "Personal growth", or leave blank.'
                )}
              />
            </label>

            <NavRow back={back} next={next} saving={saving} />
          </>
        )}

        {step === "push" && (
  <>
    <h2 className="text-xl font-semibold mb-2">
      {t("onboarding.push.title", "Task reminders (push notifications)")}
    </h2>

    <p className="text-sm text-[var(--text-muted)] mb-4">
      {t(
        "onboarding.push.subtitle",
        "Enable browser notifications for task reminders on this device."
      )}
    </p>

    {pushChecking ? (
      <p className="text-[11px] text-[var(--text-muted)]">
        {t("settings.taskReminders.checking", "Checking notification status…")}
      </p>
    ) : pushEnabled ? (
      <p className="text-sm text-emerald-400">
        {t(
          "settings.taskReminders.enabled",
          "✅ Push notifications are already enabled on this device."
        )}
      </p>
    ) : (
      <button
        type="button"
        onClick={enablePush}
        disabled={pushLoading}
        className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm disabled:opacity-60"
      >
        {pushLoading
          ? t("settings.taskReminders.enabling", "Enabling…")
          : t("settings.taskReminders.enable", "Enable task reminders (push)")}
      </button>
    )}

    {pushStatus && (
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">{pushStatus}</p>
    )}

    <NavRow back={back} next={next} saving={saving} />
  </>
)}

        {step === "finish" && (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {t("onboarding.finish.title", "All set 🚀")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {t(
                "onboarding.finish.subtitle",
                "Your setup is saved. You can edit everything anytime in Settings."
              )}
            </p>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
              >
                {t("onboarding.back", "Back")}
              </button>

              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm disabled:opacity-60"
              >
                {saving ? t("auth.loading.button", "Please wait…") : t("onboarding.finish.button", "Go to dashboard")}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function NavRow({
  back,
  next,
  saving,
}: {
  back: () => void;
  next: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-6">
      <button
        type="button"
        onClick={back}
        className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
      >
        Back
      </button>

      <button
        type="button"
        onClick={next}
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
