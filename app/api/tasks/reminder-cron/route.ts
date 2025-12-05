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
  console.warn(
    "[reminder-cron] Missing VAPID keys – push notifications will be skipped."
  );
} else {
  webpush.setVapidDetails(
    "mailto:hello@aiprod.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export const runtime = "nodejs";

export async function GET() {
  try {
    const nowIso = new Date().toISOString();

    // 1. Find due reminders
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select(
        "id, title, note, description, user_id, reminder_at, due_at, reminder_enabled"
      )
      .eq("reminder_enabled", true)
      .lte("reminder_at", nowIso);

    if (error) {
      console.error("[reminder-cron] query error:", error);
      return NextResponse.json(
        { ok: false, error: "DB error" },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aiprod.app";

    for (const task of tasks) {
      // 2. Load user profile (email)
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", task.user_id)
        .maybeSingle();

      if (profileErr) {
        console.error(
          "[reminder-cron] profile load error:",
          profileErr
        );
      }

      const email = profile?.email ?? null;

      // 2a. Email reminder
      if (email) {
        try {
          await sendTaskReminderEmail({
            to: email,
            taskTitle: task.title || "Your task",
            taskNote:
              (task as any).note ||
              (task as any).description ||
              null,
            dueAt:
              (task as any).reminder_at ||
              (task as any).due_at ||
              null,
          });
        } catch (e) {
          console.error(
            "[reminder-cron] email send failed:",
            e
          );
        }
      }

      // 2b. Push notifications (if VAPID configured)
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        try {
          const { data: subs, error: subErr } =
            await supabaseAdmin
              .from("push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("user_id", task.user_id);

          if (subErr) {
            console.error(
              "[reminder-cron] subscriptions load error:",
              subErr
            );
          } else if (subs && subs.length > 0) {
            const payload = JSON.stringify({
              title: "Task reminder",
              body: task.title || "You have a task due now.",
              url: `${baseUrl}/tasks?task=${task.id}`,
            });

            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: {
                      p256dh: sub.p256dh,
                      auth: sub.auth,
                    },
                  } as any,
                  payload
                );
              } catch (e: any) {
                console.error(
                  "[reminder-cron] push error:",
                  e?.statusCode,
                  e?.body || e
                );
                // optional: if e.statusCode === 410, delete dead subscription
              }
            }
          }
        } catch (e) {
          console.error(
            "[reminder-cron] push block error:",
            e
          );
        }
      }

      // 3. Disable reminder so it doesn’t repeat
      const { error: updErr } = await supabaseAdmin
        .from("tasks")
        .update({ reminder_enabled: false })
        .eq("id", task.id);

      if (updErr) {
        console.error(
          "[reminder-cron] failed to disable reminder:",
          updErr
        );
      }
    }

    return NextResponse.json({
      ok: true,
      processed: tasks.length,
    });
  } catch (err: any) {
    console.error("[reminder-cron] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
