// app/api/cron/reminder/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import webPush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTaskReminderEmail } from "@/lib/emailTasks";

export const runtime = "nodejs";

function checkCronAuth(req: Request): NextResponse | null {
  const CRON_SECRET = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "development") {
    return null;
  }

  if (!CRON_SECRET) {
    console.warn(
      "[reminder-cron] CRON_SECRET is not set – refusing unauthorized access."
    );
    return NextResponse.json(
      { ok: false, error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const cronKeyParam = url.searchParams.get("cron_key");

  const validByHeader = authHeader === `Bearer ${CRON_SECRET}`;
  const validByQuery = cronKeyParam === CRON_SECRET;

  if (!validByHeader && !validByQuery) {
    console.warn("[reminder-cron] Unauthorized cron call");
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron" },
      { status: 401 }
    );
  }

  return null;
}

// ---------- PUSH SETUP ----------

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    "[reminder-cron] Missing VAPID keys – push notifications for reminders will be skipped."
  );
} else {
  webPush.setVapidDetails(
    "mailto:hello@aiprod.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  subscription: any; // stored JSON from browser PushSubscription
};

/**
 * Send a push notification to all subscriptions of a user for a task reminder.
 */
async function sendTaskReminderPush(params: {
  userId: string;
  taskTitle: string;
  reminderAt?: string | null;
}) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // VAPID not configured → silently skip push
    return;
  }

  const { userId, taskTitle, reminderAt } = params;

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .eq("user_id", userId);

  if (error) {
    console.error(
      "[reminder-cron] Failed to load push_subscriptions for user",
      userId,
      error
    );
    return;
  }

  if (!subs || subs.length === 0) {
    console.log(
      "[reminder-cron] No push subscriptions found for user",
      userId
    );
    return;
  }

  const title = "Task reminder";
  const whenLabel = reminderAt
    ? new Date(reminderAt).toLocaleString()
    : "now";

  const body = `“${taskTitle}” is due ${whenLabel}.`;
  const url = "https://aiprod.app/tasks";

  const payload = JSON.stringify({
    title,
    body,
    url,
    tag: "task-reminder",
  });

  for (const row of subs as PushSubscriptionRow[]) {
    try {
      await webPush.sendNotification(row.subscription, payload);
      console.log(
        "[reminder-cron] Push sent to subscription",
        row.id,
        "for user",
        userId
      );
    } catch (err: any) {
      console.error(
        "[reminder-cron] Failed to send push to subscription",
        row.id,
        err?.statusCode || err?.message || err
      );

      // Clean up dead endpoints (410 / 404)
      const statusCode = err?.statusCode || err?.status;
      if (statusCode === 404 || statusCode === 410) {
        console.log(
          "[reminder-cron] Removing stale subscription",
          row.id
        );
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", row.id);
      }
    }
  }
}

// ---------- MAIN CRON HANDLER ----------

export async function GET(req: Request) {
  const authError = checkCronAuth(req);
  if (authError) return authError;

  if (!supabaseAdmin) {
    console.error(
      "[reminder-cron] supabaseAdmin not configured – check SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL"
    );
    return NextResponse.json(
      { ok: false, error: "Supabase admin not configured" },
      { status: 500 }
    );
  }

  try {
    const nowIso = new Date().toISOString();

    // 1) Find due tasks
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select(
        "id, user_id, title, description, reminder_at, reminder_enabled, reminder_sent_at"
      )
      .eq("reminder_enabled", true)
      .is("reminder_sent_at", null)
      .lte("reminder_at", nowIso)
      .order("reminder_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[reminder-cron] Query error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log("[reminder-cron] No due tasks found");
      return NextResponse.json({ ok: true, processed: 0, sent: 0 });
    }

    console.log("[reminder-cron] Found due tasks:", tasks.length);

    let sentCount = 0;

    for (const task of tasks as any[]) {
      const title = task.title || "Untitled task";

      try {
        // 2) Get user email
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(task.user_id);

        if (userError || !userData?.user?.email) {
          console.error(
            "[reminder-cron] Could not fetch user email for user_id",
            task.user_id,
            userError
          );
          continue;
        }

        const email = userData.user.email;

        console.log(
          "[reminder-cron] Sending reminder for task",
          task.id,
          "to",
          email,
          "at",
          task.reminder_at
        );

        // 3a) Send email
        await sendTaskReminderEmail({
          to: email,
          taskTitle: title,
          taskNote: task.description,
          dueAt: task.reminder_at,
        });

        // 3b) Send push
        await sendTaskReminderPush({
          userId: task.user_id,
          taskTitle: title,
          reminderAt: task.reminder_at,
        });

        // 4) Mark as sent
        const { error: updateError } = await supabaseAdmin
          .from("tasks")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", task.id);

        if (updateError) {
          console.error(
            "[reminder-cron] Failed to update reminder_sent_at for task",
            task.id,
            updateError
          );
          continue;
        }

        sentCount += 1;
      } catch (err) {
        console.error(
          "[reminder-cron] Error while processing task",
          task.id,
          err
        );
      }
    }

    return NextResponse.json({
      ok: true,
      processed: tasks.length,
      sent: sentCount,
    });
  } catch (err) {
    console.error("[reminder-cron] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
