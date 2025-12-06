// lib/pushServer.ts
import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

if (!publicKey || !privateKey) {
  console.warn(
    "[pushServer] Missing VAPID keys – push notifications will NOT work."
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
  if (!publicKey || !privateKey) {
    console.error("[pushServer] VAPID keys missing, skipping push send.");
    return;
  }

  const notificationPayload = JSON.stringify({
    title: "Task reminder",
    body: payload.title,
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
    // Optional: if 404/410, you can delete dead subscriptions here.
  }
}
