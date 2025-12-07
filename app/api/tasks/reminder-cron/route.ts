// app/api/tasks/reminder-cron/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTaskReminderEmail } from "@/lib/emailTasks";
import webpush from "web-push";

export const runtime = "nodejs";

// --- Push setup --------------------------------------------------------

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    "[reminder-cron] VAPID keys missing – push notifications will be skipped."
  );
} else {
  webpush.setVapidDetails(
    "mailto:hello@aiprod.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId: string, payload: any) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[reminder-cron] Skipping push – VAPID keys not configured.");
    return;
  }

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error(
      "[reminder-cron] error fetching push_subscriptions for user",
      userId,
      error
    );
    return;
  }

  if (!subs || subs.length === 0) {
    console.log("[reminder-cron] no push subscriptions for user", userId);
    return;
  }

  const notificationPayload = JSON.stringify(payload);

  for (const s of subs) {
    const subscription = {
      endpoint: s.endpoint,
      keys: {
        p256dh: s.p256dh,
        auth: s.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription as any, notificationPayload);
      console.log(
        "[reminder-cron] push sent to",
        s.endpoint,
        "for user",
        userId
      );
    } catch (err: any) {
      const status = err?.statusCode;
      console.error(
        "[reminder-cron] push error for endpoint",
        s.endpoint,
        "status:",
        status,
        "message:",
        err?.body || err?.message
      );

      // 404/410 = subscription is dead → remove it
      if (status === 404 || status === 410) {
        try {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
          console.log(
            "[reminder-cron] removed dead subscription",
            s.endpoint
          );
        } catch (cleanupErr) {
          console.error(
            "[reminder-cron] failed cleaning up dead subscription",
            cleanupErr
          );
        }
      }
    }
  }
}

// --- Cron auth ---------------------------------------------------------

function checkCronAuth(req: Request): NextResponse | null {
  const CRON_SECRET = process.env.CRON_SECRET;

  // In dev, skip auth for manual testing
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

// --- Main handler ------------------------------------------------------

export async function GET(req: Request) {
  // 0) Auth check
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
    const now = new Date();
    const nowIso = now.toISOString();

    console.log("[reminder-cron] running at", nowIso);

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
      .limit(100);

    if (error) {
      console.error("[reminder-cron] query error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log("[reminder-cron] no due tasks found");
      return NextResponse.json({ ok: true, processed: 0, sent: 0 });
    }

    console.log("[reminder-cron] found due tasks:", tasks.length);

    let sentCount = 0;

    for (const task of tasks) {
      const title = task.title || "Untitled task";

      try {
        // 2) Get user email
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(task.user_id);

        if (userError || !userData?.user?.email) {
          console.error(
            "[reminder-cron] could not fetch user email for user_id",
            task.user_id,
            userError
          );
          continue;
        }

        const email = userData.user.email;

        console.log(
          "[reminder-cron] sending reminder for task",
          task.id,
          "to",
          email,
          "reminder_at=",
          task.reminder_at
        );

        // 3a) Send email reminder
        await sendTaskReminderEmail({
          to: email,
          taskTitle: title,
          taskNote: task.description,
          dueAt: task.reminder_at,
        });

        // 3b) Send push reminder (if subscription + VAPID configured)
        await sendPushToUser(task.user_id, {
          title: "Task reminder",
          body: title,
          data: {
            taskId: task.id,
            url: "https://aiprod.app/tasks",
          },
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
        });

        // 4) Mark as sent
        const { error: updateError } = await supabaseAdmin
          .from("tasks")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", task.id);

        if (updateError) {
          console.error(
            "[reminder-cron] failed to update reminder_sent_at for task",
            task.id,
            updateError
          );
          continue;
        }

        sentCount += 1;
      } catch (err) {
        console.error(
          "[reminder-cron] error while processing task",
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
    console.error("[reminder-cron] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
