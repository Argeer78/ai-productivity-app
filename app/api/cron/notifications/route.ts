import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client (service role)
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type UserSettings = {
  user_id: string;
  daily_success_enabled: boolean;
  daily_success_time: string; // "HH:MM:SS"
  evening_reflection_enabled: boolean;
  evening_reflection_time: string;
  task_reminders_enabled: boolean;
  weekly_report_enabled: boolean;
  timezone: string;
};

// ── Helper: simple "is within this minute" check ─────────────
function isTimeMatch(targetTime: string, now: Date): boolean {
  // targetTime from DB: "HH:MM:SS"
  const [h, m] = targetTime.split(":").map((x) => parseInt(x, 10));
  return now.getHours() === h && now.getMinutes() === m;
}

// Placeholder: later you plug real push/email here
async function sendNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  console.log("[cron/notifications] Would notify user:", {
    userId,
    ...payload,
  });

  // Example for later:
  // 1) Fetch push_subscriptions for this user
  // 2) Call FCM / OneSignal / web-push
  // 3) Optionally fallback to email via Resend
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  console.log("[cron/notifications] Running at", now.toISOString());

  try {
    // For v1 we ignore individual timezones and just assume times are in server timezone.
    // Later: convert "now" to each user's timezone using e.g. Intl or a library.
    const { data, error } = await supabaseAdmin
      .from("user_notification_settings")
      .select(
        "user_id, daily_success_enabled, daily_success_time, evening_reflection_enabled, evening_reflection_time, task_reminders_enabled, weekly_report_enabled, timezone"
      );

    if (error) {
      console.error("[cron/notifications] load settings error", error);
      return new Response("Error loading settings", { status: 500 });
    }

    const settingsList = (data || []) as UserSettings[];

    for (const s of settingsList) {
      // 1) Morning Daily Success reminder
      if (
        s.daily_success_enabled &&
        isTimeMatch(s.daily_success_time, now)
      ) {
        await sendNotification(s.user_id, {
          title: "Daily Success: rate today 🎯",
          body: "Take 10 seconds to rate today and keep your streak alive.",
          url: "/daily-success",
        });
      }

      // 2) Evening reflection reminder
      if (
        s.evening_reflection_enabled &&
        isTimeMatch(s.evening_reflection_time, now)
      ) {
        await sendNotification(s.user_id, {
          title: "Evening reflection 🌙",
          body: "How did today actually go? Capture a short reflection.",
          url: "/daily-success",
        });
      }

      // 3) Task reminders (very simple v1: nudge at reminder times)
      if (s.task_reminders_enabled) {
        // You can make this more advanced later:
        // - Query tasks with due_date = today and time_from <= now, not completed.
        // For now we just send a generic nudge once per day at morning reminder time.
        // (Or add a second dedicated field for task reminder time if you like.)
      }

      // 4) Weekly report notifications
      // For v1 we can keep this TODO:
      // - If it's e.g. Monday 09:00 and user has weekly_report_enabled,
      //   send a "Your weekly AI report is ready" once your weekly report job runs.
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[cron/notifications] unexpected error", err);
    return new Response("Internal error", { status: 500 });
  }
}
