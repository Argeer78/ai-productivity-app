import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

// Ensure that VAPID keys are set correctly
if (!publicKey || !privateKey) {
  throw new Error("[pushServer] Missing VAPID keys – push notifications will NOT work.");
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
  // Ensure the payload has valid data
  if (!payload.taskId || !payload.title) {
    console.error("[pushServer] Invalid payload: Missing taskId or title.");
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || "Task reminder",  // Fallback to "Task reminder"
    body: payload.note || "You have something to review.",
    data: {
      url: "https://aiprod.app/tasks",  // Update with dynamic URL if needed
      taskId: payload.taskId,
    },
  });

  try {
    // Send push notification using web-push
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
      console.log("[pushServer] Subscription expired, removing from DB.");
      // You should delete the expired subscription from your database here
      try {
        await deleteExpiredSubscription(sub.endpoint);
      } catch (dbError) {
        console.error("[pushServer] Failed to delete expired subscription:", dbError);
      }
    }
  }
}

// Example function to delete expired subscriptions
async function deleteExpiredSubscription(endpoint: string) {
  // Here you can implement the logic to remove the expired subscription from your DB
  console.log("[pushServer] Deleting expired subscription from DB:", endpoint);
  // For example, with Supabase:
  // await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
