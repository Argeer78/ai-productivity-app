"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SettingsRow = {
  daily_success_enabled: boolean;
  daily_success_time: string; // "HH:MM:SS" from DB
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

export default function NotificationSettings({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<SettingsRow>(DEFAULT_SETTINGS);

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
          .select(
            "daily_success_enabled, daily_success_time, evening_reflection_enabled, evening_reflection_time, task_reminders_enabled, weekly_report_enabled, timezone"
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("[notifications] load error", error);
          setError("Failed to load notification settings.");
          return;
        }

        if (!data) {
          // Insert defaults
          const { error: insertError } = await supabase
            .from("user_notification_settings")
            .insert([{ user_id: userId }]);

          if (insertError) {
            console.error("[notifications] insert default error", insertError);
            setError("Failed to initialize notification settings.");
            return;
          }

          setSettings(DEFAULT_SETTINGS);
        } else {
          // Normalize time to HH:MM (strip seconds)
          const normalizeTime = (t: string | null) =>
            (t || "00:00:00").slice(0, 5);

          setSettings({
            daily_success_enabled: data.daily_success_enabled,
            daily_success_time: normalizeTime(data.daily_success_time),
            evening_reflection_enabled: data.evening_reflection_enabled,
            evening_reflection_time: normalizeTime(
              data.evening_reflection_time
            ),
            task_reminders_enabled: data.task_reminders_enabled,
            weekly_report_enabled: data.weekly_report_enabled,
            timezone: data.timezone,
          });
        }
      } catch (err) {
        console.error("[notifications] load exception", err);
        setError("Failed to load notification settings.");
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
      const payload = {
        user_id: userId,
        daily_success_enabled: settings.daily_success_enabled,
        daily_success_time: settings.daily_success_time + ":00",
        evening_reflection_enabled: settings.evening_reflection_enabled,
        evening_reflection_time: settings.evening_reflection_time + ":00",
        task_reminders_enabled: settings.task_reminders_enabled,
        weekly_report_enabled: settings.weekly_report_enabled,
        timezone: settings.timezone || "Europe/Athens",
      };

      const { error } = await supabase
        .from("user_notification_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.error("[notifications] save error", error);
        setError("Failed to save notification settings.");
        return;
      }

      setMessage("Saved! Your reminders will use these times.");
    } catch (err) {
      console.error("[notifications] save exception", err);
      setError("Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-muted)]">
        Loading notification settings…
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-xs md:text-sm space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text-main)]">
        Notifications & Reminders
      </h2>
      <p className="text-[11px] text-[var(--text-muted)]">
        Control gentle reminders for your Daily Success score, evening
        reflection and tasks. These will show up on your phone{" "}
        <span className="font-semibold">
          and on any connected smartwatch
        </span>{" "}
        (via normal notifications).
      </p>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {message && (
        <p className="text-[11px] text-emerald-400">{message}</p>
      )}

      {/* Daily Success */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.daily_success_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                daily_success_enabled: e.target.checked,
              }))
            }
            className="h-3 w-3 rounded border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          />
          <span>Morning Daily Success reminder</span>
        </label>
        <input
          type="time"
          value={settings.daily_success_time}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              daily_success_time: e.target.value,
            }))
          }
          className="rounded-lg bg-[var(--bg-body)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
        />
      </div>

      {/* Evening reflection */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.evening_reflection_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                evening_reflection_enabled: e.target.checked,
              }))
            }
            className="h-3 w-3 rounded border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          />
          <span>Evening reflection reminder</span>
        </label>
        <input
          type="time"
          value={settings.evening_reflection_time}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              evening_reflection_time: e.target.value,
            }))
          }
          className="rounded-lg bg-[var(--bg-body)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
        />
      </div>

      {/* Task reminders */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.task_reminders_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                task_reminders_enabled: e.target.checked,
              }))
            }
            className="h-3 w-3 rounded border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          />
          <span>Task reminders</span>
        </label>
        <p className="text-[11px] text-[var(--text-muted)]">
          You&apos;ll get a nudge when tasks are due today.
        </p>
      </div>

      {/* Weekly report */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={settings.weekly_report_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                weekly_report_enabled: e.target.checked,
              }))
            }
            className="h-3 w-3 rounded border-[var(--border-strong)] bg-[var(--bg-elevated)]"
          />
          <span>Weekly report notification</span>
        </label>
        <p className="text-[11px] text-[var(--text-muted)]">
          When your weekly AI report is ready, you&apos;ll get a notification.
        </p>
      </div>

      {/* Timezone */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[var(--text-muted)]">
          Timezone (for scheduling reminders)
        </label>
        <input
          type="text"
          value={settings.timezone}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              timezone: e.target.value,
            }))
          }
          className="max-w-xs rounded-lg bg-[var(--bg-body)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
          placeholder='e.g. Europe/Athens'
        />
        <p className="text-[10px] text-[var(--text-muted)]">
          You can change this later. Use standard IANA names like
          &quot;Europe/Athens&quot; or &quot;America/New_York&quot;.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs text-[var(--accent-contrast)]"
      >
        {saving ? "Saving…" : "Save notification settings"}
      </button>
    </section>
  );
}
