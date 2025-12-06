import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  console.error("Missing VAPID keys");
  process.exit(1);
}

webpush.setVapidDetails(
  "mailto:hello@aiprod.app",
  publicKey,
  privateKey
);

// 🔥 Replace with your actual subscription from Supabase
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/exYcQCrZuKI:APA91bHWwAyFHGC7BTG6w34w5CrMF2a1yC2rGyGwJNPDVki4sS75r78kh8t345FKYJfB654YcxBLBCt8hsYOSONLu23amZmmomeCi01zAFxuAZE9Vp2IVVyVhcmxd89nALF_h3lFCBgD",
  keys: {
    p256dh: "BPqVuObTakMX8uwgHShJaH77c7WlycVxjc_2eaDjyWzeRKabx_MXZTf39nLQjnIgSORwXOYzJsSHneEcGslZxF0",
    auth: "mLv-soei2oaXHjxdJ_caIA"
  }
};

// Payload (same shape your service worker expects)
const payload = JSON.stringify({
  title: "Manual Push Test",
  body: "If you see this, push is working!",
  data: {
    url: "https://aiprod.app/tasks",
    taskId: "manual-test"
  }
});

webpush.sendNotification(subscription, payload)
  .then(() => console.log("Push sent!"))
  .catch(err => console.error("Push error:", err));
