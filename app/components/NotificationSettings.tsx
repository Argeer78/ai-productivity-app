"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToPush } from "@/lib/pushClient";
import { useT } from "@/lib/useT";

type SettingsRow = {
  daily_success_enabled: boolean;
  daily_success_time: string; // stored as "HH:MM:SS" in DB (likely)
  evening_reflection_enabled: boolean;
  evening_reflection_time: string;
  task_reminders_enabled: boolean;
  weekly_report_enabled: boolean;
  timezone: string;
};

type Props = {
  userId: string;
};

const DEFAULT_SETTINGS: SettingsRow = {
  daily_success_enabled: true,
  daily_success_time: "09:00:00",
  evening_reflection_enabled: true,
  evening_reflection_time: "21:30:00",
  task_reminders_enabled: true,
  weekly_report_enabled: true,
  timezone: "Europe/Athens",
};

// HTML <input type="time"> expects "HH:MM"
function toTimeInputValue(dbTime: string) {
  if (!dbTime) return "09:00";
  // "09:00:00" -> "09:00"
  return dbTime.length >= 5 ? dbTime.slice(0, 5) : dbTime;
}

// Convert back to "HH:MM:SS" for DB
function toDbTimeValue(inputTime: string) {
  if (!inputTime) return "09:00:00";
  // "09:00" -> "09:00:00"
  return inputTime.length === 5 ? `${inputTime}:00` : inputTime;
}

export default function NotificationSettings({ userId }: Props) {
  // IMPORTANT: keys are already "settings.*" so we use root namespace
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(key, fallback);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SettingsRow>(DEFAULT_SETTINGS);

  const timeValue = useMemo(
    () => toTimeInputValue(settings.daily_success_time),
    [settings.daily_success_time]
  );

  // Load settings (or create defaults)
  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const { data, error } = await supabase
          .from("user_notification_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          setError(
            t(
              "settings.notifications.loadError",
              "Failed to load notification settings."
            )
          );
          return;
        }

        setSettings((data as SettingsRow) || DEFAULT_SETTINGS);
      } catch (err) {
        console.error("[notifications] load exception", err);
        setError(
          t(
            "settings.notifications.loadError",
            "Failed to load notification settings."
          )
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Save settings to database
      const { error } = await supabase
        .from("user_notification_settings")
        .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" });

      if (error) {
        setError(
          t(
            "settings.notifications.saveError",
            "Failed to save notification settings."
          )
        );
        return;
      }

      // Subscribe to push if task reminders are enabled
      if (settings.task_reminders_enabled) {
        try {
          await subscribeToPush(userId);
        } catch (e) {
          console.error("[notifications] push subscribe error", e);
          setError(
            t(
              "settings.notifications.pushSubscribeError",
              "Failed to subscribe to push notifications."
            )
          );
          return;
        }
      }

      setMessage(
        t(
          "settings.notifications.savedMessage",
          "Saved! Your reminders will use these times."
        )
      );
    } catch (err) {
      console.error("[notifications] save exception", err);
      setError(
        t(
          "settings.notifications.saveError",
          "Failed to save notification settings."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-[11px] text-[var(--text-muted)]">
        {t(
          "settings.notifications.loading",
          "Loading notification settings…"
        )}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
      <div>
        <p className="text-[11px] font-semibold text-[var(--text-main)]">
          {t(
            "settings.section.notifications",
            "Notifications & Reminders"
          )}
        </p>
      </div>

      {/* Daily Success */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[11px] text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.daily_success_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                daily_success_enabled: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
          />
          <span>
            {t(
              "settings.notifications.dailySuccess",
              "Morning Daily Success reminder"
            )}
          </span>
        </label>

        <div className="flex items-center gap-2">
          <input
            type="time"
            value={timeValue}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                daily_success_time: toDbTimeValue(e.target.value),
              }))
            }
            className="w-fit rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 py-2 text-[11px] text-[var(--text-main)]"
          />
          <span className="text-[10px] text-[var(--text-muted)]">
            {settings.timezone}
          </span>
        </div>
      </div>

      {/* Task Reminders */}
      <div>
        <label className="flex items-center gap-2 text-[11px] text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.task_reminders_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                task_reminders_enabled: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-body)]"
          />
          <span>
            {t(
              "settings.notifications.taskReminders",
              "Task reminders"
            )}
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-[11px] text-[var(--accent-contrast)]"
        >
          {saving
            ? t("settings.notifications.saving", "Saving…")
            : t(
              "settings.notifications.save",
              "Save notification settings"
            )}
        </button>

        {message && (
          <p className="text-[11px] text-emerald-400">{message}</p>
        )}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    </section>
  );
}
