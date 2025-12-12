// lib/pushServer.ts
import "server-only";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

if (!publicKey || !privateKey) {
  throw new Error(
    "[pushServer] Missing VAPID keys – push notifications will NOT work."
  );
} else {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type TaskPushPayload = {
  taskId: string;
  title: string;
  note?: string | null;
};

export async function sendTaskReminderPush(
  sub: SubscriptionRow,
  payload: TaskPushPayload
) {
  if (!payload.taskId || !payload.title) {
    console.error("[pushServer] Invalid payload: Missing taskId or title.");
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || "Task reminder",
    body: payload.note || "You have something to review.",
    data: {
      url: "https://aiprod.app/tasks",
      taskId: payload.taskId,
    },
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      },
      notificationPayload
    );
    console.log("[pushServer] Push sent to", sub.endpoint);
  } catch (err: any) {
    console.error(
      "[pushServer] Failed to send push notification:",
      err?.statusCode,
      err?.body || err
    );

    // If subscription is gone, remove it from DB
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      console.log(
        "[pushServer] Subscription expired, removing from DB:",
        sub.endpoint
      );

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        console.warn(
          "[pushServer] supabaseAdmin not available (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Can't delete expired subscription."
        );
        return;
      }

      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);

      if (error) {
        console.error(
          "[pushServer] Failed to delete expired subscription:",
          error
        );
      }
    }
  }
}
