// app/api/tasks/reminder-cron/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "web-push";
import { sendTaskReminderEmail } from "@/lib/emailTasks";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("[reminder-cron] VAPID keys are not configured");
}

webpush.setVapidDetails(
  "mailto:hello@aiprod.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date().toISOString();

    // 1) Find tasks that are due for a reminder
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, user_id, reminder_at, due_at")
      .eq("reminder_enabled", true)
      .lte("reminder_at", now);

    if (tasksError) {
      console.error("[reminder-cron] DB query error:", tasksError);
      return NextResponse.json(
        { ok: false, error: "DB query error", details: tasksError.message },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Collect user ids for profiles + notification settings
    const userIds = Array.from(
      new Set(tasks.map((t) => t.user_id).filter(Boolean))
    );

    // 2) Load profiles (emails) for all involved users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError) {
      console.error("[reminder-cron] profiles query error:", profilesError);
    }

    const profileById = new Map<string, { email: string | null }>();
    (profiles || []).forEach((p) => {
      profileById.set(p.id, { email: p.email || null });
    });

    // 3) Load notification settings so we respect task_reminders_enabled
    const { data: notifSettings, error: notifError } = await supabaseAdmin
      .from("user_notification_settings")
      .select("user_id, task_reminders_enabled")
      .in("user_id", userIds);

    if (notifError) {
      console.error("[reminder-cron] notification settings error:", notifError);
    }

    const taskRemindersEnabledByUser = new Map<string, boolean>();
    (notifSettings || []).forEach((row) => {
      taskRemindersEnabledByUser.set(
        row.user_id,
        !!row.task_reminders_enabled
      );
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aiprod.app";

    let processed = 0;

    for (const task of tasks) {
      const userId = task.user_id;
      if (!userId) continue;

      // Respect the "Task reminders" toggle in NotificationSettings
      const isTaskReminderEnabled =
        taskRemindersEnabledByUser.get(userId) ?? true; // default true if missing row

      if (!isTaskReminderEnabled) {
        // Skip both email + push for this user
        continue;
      }

      const profile = profileById.get(userId);
      const email = profile?.email || null;

      // 3a) Email reminder (Resend)
      if (email) {
        try {
          await sendTaskReminderEmail({
            to: email,
            taskTitle: task.title || "Your task",
            taskNote: task.description || null,
            dueAt: task.reminder_at || task.due_at || null,
          });
        } catch (e) {
          console.error("[reminder-cron] email send failed:", e);
        }
      }

      // 3b) Push notifications for all subscriptions of this user
      try {
        const { data: subs, error: subsError } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (subsError) {
          console.error(
            "[reminder-cron] subscriptions load error:",
            subsError
          );
        } else if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title: "Task reminder",
            body: task.title || "You have a task due now.",
            url: `${baseUrl}/tasks?task=${task.id}`,
          });

          for (const sub of subs) {
            const pushSub = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            try {
              await webpush.sendNotification(pushSub as any, payload);
            } catch (e: any) {
              console.error(
                "[reminder-cron] push error:",
                e?.statusCode,
                e?.body || e
              );
              // Optionally: delete dead subscriptions here
            }
          }
        }
      } catch (e) {
        console.error("[reminder-cron] push block error:", e);
      }

      // 4) Disable reminder so it doesn’t repeat
      try {
        await supabaseAdmin
          .from("tasks")
          .update({ reminder_enabled: false })
          .eq("id", task.id);
      } catch (e) {
        console.error("[reminder-cron] failed to disable reminder:", e);
      }

      processed += 1;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err: any) {
    console.error("[reminder-cron] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
