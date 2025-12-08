// app/api/tasks/reminder-cron/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTaskReminderEmail } from "@/lib/emailTasks";
import { sendTaskReminderPush } from "@/lib/pushServer";

export const runtime = "nodejs";

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
    const now = new Date();
    const nowIso = now.toISOString();
    console.log("[reminder-cron] running at", nowIso);

    // 1) Find due tasks that have a reminder enabled and not yet sent
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

        // 3b) Fetch push subscriptions for this user
        const { data: subs, error: subsError } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", task.user_id);

        if (subsError) {
          console.error(
            "[reminder-cron] error fetching push_subscriptions for user",
            task.user_id,
            subsError
          );
        } else if (!subs || subs.length === 0) {
          console.log(
            "[reminder-cron] no push subscriptions for user",
            task.user_id
          );
        } else {
          // 3c) Send push for each subscription
          for (const sub of subs) {
            try {
              await sendTaskReminderPush(
                {
                  endpoint: sub.endpoint,
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
                {
                  taskId: task.id,
                  title,
                  note: task.description ?? null,
                }
              );
            } catch (pushErr) {
              console.error(
                "[reminder-cron] push error for user",
                task.user_id,
                "task",
                task.id,
                pushErr
              );
            }
          }
        }

        // 4) Mark as sent so we don't send it again
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
