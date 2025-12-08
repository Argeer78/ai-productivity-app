// lib/pushServer.ts
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

// We DON'T throw anymore – otherwise any import in dev with missing envs
// would crash the whole API. We just no-op.
let PUSH_CONFIGURED = true;

if (!publicKey || !privateKey) {
  PUSH_CONFIGURED = false;
  console.warn(
    "[pushServer] Missing VAPID keys – push notifications will NOT work in this environment."
  );
} else {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type TaskPushPayload = {
  taskId: string;
  title: string;
  note?: string | null;
};

export async function sendTaskReminderPush(
  sub: SubscriptionRow,
  payload: TaskPushPayload
) {
  if (!PUSH_CONFIGURED) {
    console.log(
      "[pushServer] Skipping push send – VAPID keys not configured."
    );
    return;
  }

  // Ensure the payload has valid data
  if (!payload.taskId || !payload.title) {
    console.error("[pushServer] Invalid payload: Missing taskId or title.");
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || "Task reminder", // Fallback to "Task reminder"
    body: payload.note || "You have something to review.",
    data: {
      url: "https://aiprod.app/tasks", // same as in service worker default
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

    // Handle expired or dead subscriptions (e.g., 410 Gone, 404 Not Found)
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      console.log(
        "[pushServer] Subscription expired or invalid – deleting from DB."
      );
      try {
        await deleteExpiredSubscription(sub.endpoint);
      } catch (dbError) {
        console.error(
          "[pushServer] Failed to delete expired subscription:",
          dbError
        );
      }
    }
  }
}

// Real implementation – cleans up dead subs in Supabase
async function deleteExpiredSubscription(endpoint: string) {
  if (!supabaseAdmin) {
    console.error(
      "[pushServer] supabaseAdmin not configured; cannot delete expired subscription."
    );
    return;
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error(
      "[pushServer] Error deleting expired subscription from DB:",
      error
    );
  } else {
    console.log(
      "[pushServer] Deleted expired subscription for endpoint:",
      endpoint
    );
  }
}
