// app/api/tasks/reminder-cron/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "web-push";
import { sendTaskReminderEmail } from "@/lib/emailTasks";

const CRON_SECRET = process.env.CRON_SECRET || "";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    "[reminder-cron] Missing VAPID keys – push notifications may fail."
  );
}

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:hello@aiprod.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  }
} catch (e) {
  console.error("[reminder-cron] webpush VAPID init error:", e);
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  // 🔒 Guard: prevent random hits in browser
  if (!CRON_SECRET) {
    console.warn("[reminder-cron] CRON_SECRET not set");
  } else {
    const headerSecret = req.headers.get("x-cron-secret") || "";
    if (headerSecret !== CRON_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized cron" },
        { status: 401 }
      );
    }
  }

  const now = new Date().toISOString();

  // 1. Find due reminders (only tasks that haven't fired yet)
  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, user_id, reminder_at, reminder_enabled")
    .eq("reminder_enabled", true)
    .lte("reminder_at", now);

  if (error) {
    console.error("[reminder-cron] query error:", error);
    return NextResponse.json(
      { ok: false, error: "DB query error" },
      { status: 500 }
    );
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aiprod.app";

  let processedCount = 0;

  for (const task of tasks) {
    const taskId = task.id;
    const userId = task.user_id;

    // Safety: if either missing, skip
    if (!taskId || !userId) continue;

    // 1) Load user profile (email) once per task
    let email: string | null = null;
    try {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        console.error(
          "[reminder-cron] profile load error for user",
          userId,
          profileErr
        );
      } else {
        email = profile?.email || null;
      }
    } catch (e) {
      console.error("[reminder-cron] profile load exception:", e);
    }
    
// Check user_notification_settings.task_reminders_enabled
let taskRemindersEnabled = true;
try {
  const { data: notifSettings, error: notifErr } = await supabaseAdmin
    .from("user_notification_settings")
    .select("task_reminders_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (notifErr) {
    console.error(
      "[reminder-cron] notification settings load error for user",
      userId,
      notifErr
    );
  } else if (
    notifSettings &&
    notifSettings.task_reminders_enabled === false
  ) {
    taskRemindersEnabled = false;
  }
} catch (e) {
  console.error(
    "[reminder-cron] notification settings exception for user",
    userId,
    e
  );
}

if (!taskRemindersEnabled) {
  // Still disable reminder so it doesn't keep firing:
  await supabaseAdmin
    .from("tasks")
    .update({ reminder_enabled: false })
    .eq("id", taskId);
  continue;
}

    // 2) Email reminder (best-effort)
    if (email) {
      try {
        await sendTaskReminderEmail({
          to: email,
          taskTitle: task.title || "Your task",
          // keep it simple for now; no notes/dueAt to avoid schema issues
        });
      } catch (e) {
        console.error("[reminder-cron] email send failed:", e);
      }
    }

    // 3) Push notifications (best-effort)
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        const { data: subs, error: subErr } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (subErr) {
          console.error(
            "[reminder-cron] subscriptions load error for user",
            userId,
            subErr
          );
        } else if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title: "Task reminder",
            body: task.title || "You have a task due now.",
            url: `${baseUrl}/tasks?task=${taskId}`,
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
              // here we could optionally delete dead subscriptions (410)
            }
          }
        }
      } catch (e) {
        console.error("[reminder-cron] push block error:", e);
      }
    }

    // 4) Disable reminder so this task doesn't trigger again
    try {
      const { error: updateErr } = await supabaseAdmin
        .from("tasks")
        .update({ reminder_enabled: false })
        .eq("id", taskId);

      if (updateErr) {
        console.error(
          "[reminder-cron] failed to disable reminder for task",
          taskId,
          updateErr
        );
      } else {
        processedCount += 1;
      }
    } catch (e) {
      console.error(
        "[reminder-cron] exception while disabling reminder for task",
        taskId,
        e
      );
    }
  }

  return NextResponse.json({ ok: true, processed: processedCount });
}
