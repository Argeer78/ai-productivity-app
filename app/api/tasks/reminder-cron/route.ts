import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "web-push";
import { sendTaskReminderEmail } from "@/lib/emailTasks"; // your existing helper

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

webpush.setVapidDetails(
  "mailto:hello@aiprod.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const runtime = "nodejs";

export async function GET() {
  const now = new Date().toISOString();

  // 1. Find due reminders
  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, user_id, reminder_at")
    .eq("reminder_enabled", true)
    .lte("reminder_at", now);

  if (error) {
    console.error("[reminder-cron] query error:", error);
    return NextResponse.json({ ok: false });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aiprod.app";

  for (const task of tasks) {
    // Load user profile (email)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", task.user_id)
      .maybeSingle();

    const email = profile?.email || null;

    // 2a. Email reminder (existing behaviour)
    if (email) {
      try {
        await sendTaskReminderEmail({
          to: email,
          title: task.title || "Your task",
        });
      } catch (e) {
        console.error("[reminder-cron] email send failed:", e);
      }
    }

    // 2b. Push notifications if any subscription exists
    try {
      const { data: subs, error: subErr } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", task.user_id);

      if (subErr) {
        console.error("[reminder-cron] subscriptions load error:", subErr);
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
            console.error("[reminder-cron] push error:", e?.statusCode, e?.body || e);
            // If subscription is gone, you could optionally delete it here
          }
        }
      }
    } catch (e) {
      console.error("[reminder-cron] push block error:", e);
    }

    // 3. Disable reminder so it doesn’t repeat
    try {
      await supabaseAdmin
        .from("tasks")
        .update({ reminder_enabled: false })
        .eq("id", task.id);
    } catch (e) {
      console.error("[reminder-cron] failed to disable reminder:", e);
    }
  }

  return NextResponse.json({ ok: true, processed: tasks.length });
}
