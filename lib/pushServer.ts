// lib/pushServer.ts
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

// Configure VAPID once, centrally
if (!publicKey || !privateKey) {
  console.warn(
    "[pushServer] Missing VAPID keys – push notifications will NOT be sent."
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
  if (!publicKey || !privateKey) {
    console.log(
      "[pushServer] Skipping push – VAPID keys not configured in environment."
    );
    return;
  }

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
    const status = err?.statusCode;
    console.error(
      "[pushServer] Failed to send push notification:",
      status,
      err?.body || err
    );

    // Clean up dead subscriptions
    if (status === 404 || status === 410) {
      try {
        console.log(
          "[pushServer] Subscription expired, removing from DB:",
          sub.endpoint
        );
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      } catch (dbError) {
        console.error(
          "[pushServer] Failed to delete expired subscription:",
          dbError
        );
      }
    }
  }
}
