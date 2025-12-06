import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToPush } from "@/lib/pushClient"; // Assuming the function is imported from your pushClient

type SettingsRow = {
  daily_success_enabled: boolean;
  daily_success_time: string;
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
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          setError("Failed to load notification settings.");
          return;
        }

        setSettings(data || DEFAULT_SETTINGS);
      } catch (err) {
        console.error("[notifications] load exception", err);
        setError("Failed to load notification settings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  // Save settings, including push notification subscription if needed
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
        setError("Failed to save notification settings.");
        return;
      }

      // Trigger push notification subscription if task reminders are enabled
      if (settings.task_reminders_enabled) {
        const subscribed = await subscribeToPush(userId);
        if (!subscribed) {
          setError("Failed to subscribe to push notifications.");
          return;
        }
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
    return <div>Loading notification settings…</div>;
  }

  return (
    <section>
      <h2>Notifications & Reminders</h2>

      {/* Daily Success */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.daily_success_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                daily_success_enabled: e.target.checked,
              }))
            }
          />
          Morning Daily Success reminder
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
        />
      </div>

      {/* Task Reminders */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.task_reminders_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                task_reminders_enabled: e.target.checked,
              }))
            }
          />
          Task reminders
        </label>
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save notification settings"}
      </button>

      {message && <p>{message}</p>}
      {error && <p>{error}</p>}
    </section>
  );
}
