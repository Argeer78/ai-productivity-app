// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCronAuth } from "@/lib/verifyCron";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

type NotificationSettingsRow = {
  user_id: string;
  daily_success_enabled: boolean;
  daily_success_time: string | null;
  evening_reflection_enabled: boolean;
  evening_reflection_time: string | null;
  task_reminders_enabled: boolean;
  weekly_report_enabled: boolean;
  timezone: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
};

/**
 * Get "HH:MM" for "now" in a given timezone using Intl.
 */
function getLocalHHMM(timezone: string): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/**
 * Core notifications runner.
 * - If opts.force === true → ignore time matching & just send them once (for testing).
 */
export async function runNotifications(opts?: {
  force?: boolean;
}): Promise<{ ok: boolean; processed: number }> {
  const force = !!opts?.force;

  // 1) Load notification settings
  const { data: settings, error: settingsError } =
    await supabaseAdmin
      .from("user_notification_settings")
      .select(
        "user_id, daily_success_enabled, daily_success_time, evening_reflection_enabled, evening_reflection_time, task_reminders_enabled, weekly_report_enabled, timezone"
      );

  if (settingsError) {
    console.error("[notifications] settings query error", settingsError);
    throw settingsError;
  }

  if (!settings || settings.length === 0) {
    console.log("[notifications] No user_notification_settings rows found.");
    return { ok: true, processed: 0 };
  }

  // 2) Load profiles to get emails
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email");

  if (profilesError) {
    console.error("[notifications] profiles query error", profilesError);
    throw profilesError;
  }

  const profileById = new Map<string, ProfileRow>();
  (profiles || []).forEach((p) => profileById.set(p.id, p as ProfileRow));

  let processed = 0;

  for (const row of settings as NotificationSettingsRow[]) {
    const profile = profileById.get(row.user_id);
    if (!profile?.email) continue;

    const email = profile.email;
    const timezone = row.timezone || "Europe/Athens";

    // e.g. "09:00", "21:30"
    const nowHHMM = getLocalHHMM(timezone);
    const dailyTime = (row.daily_success_time || "09:00:00").slice(0, 5);
    const eveningTime = (row.evening_reflection_time || "21:30:00").slice(0, 5);

    // DAILY SUCCESS REMINDER
    if (
      row.daily_success_enabled &&
      (force || nowHHMM === dailyTime)
    ) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Daily Success – quick check-in",
          text:
            "Take 10 seconds to score your day from 0–100 in AI Productivity Hub.\n\n" +
            "Open the Daily Success page: https://aiprod.app/daily-success\n\n" +
            "You can change reminder time in Settings → Notifications.",
        });
        processed++;
        console.log("[notifications] sent daily-success to", email);
      } catch (err: any) {
        console.error(
          "[notifications] daily-success send error for",
          email,
          err?.message || err
        );
      }
    }

    // EVENING REFLECTION REMINDER
    if (
      row.evening_reflection_enabled &&
      (force || nowHHMM === eveningTime)
    ) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Evening reflection – 2-minute wrap-up",
          text:
            "Write a quick reflection about what went well, what was hard, and what you’ll focus on tomorrow.\n\n" +
            "Open the Daily Success page: https://aiprod.app/daily-success\n\n" +
            "You can change reminder time in Settings → Notifications.",
        });
        processed++;
        console.log("[notifications] sent evening-reflection to", email);
      } catch (err: any) {
        console.error(
          "[notifications] evening-reflection send error for",
          email,
          err?.message || err
        );
      }
    }

    // TASK REMINDERS (simple version: if enabled, nudge once per day)
    // You can make this smarter later (check tasks due today, etc.)
    if (row.task_reminders_enabled && (force || nowHHMM === dailyTime)) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Tasks for today",
          text:
            "Quick reminder to review your tasks for today in AI Productivity Hub.\n\n" +
            "Open Tasks: https://aiprod.app/tasks\n\n" +
            "You can turn this off in Settings → Notifications.",
        });
        processed++;
        console.log("[notifications] sent task-reminder to", email);
      } catch (err: any) {
        console.error(
          "[notifications] task-reminder send error for",
          email,
          err?.message || err
        );
      }
    }
  }

  return { ok: true, processed };
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";

    const result = await runNotifications({ force });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[notifications] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
