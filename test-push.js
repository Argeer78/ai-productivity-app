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
  endpoint: "https://fcm.googleapis.com/fcm/send/ecKUCMbQwtY:APA91bFQYNkfPHsQ8z4iqsT8YbzF71btiRqHxOL1ai-aYSEZKCerLBH7VIgsE5yniuOIGUAKKk6DnqgkSe2Xim-hAim2jOkUO-Ii-2Bm-QqMIREazMrJ0wE5J1j3xoYA9fqsNHsTxU3d",
  keys: {
    p256dh: "BC0zzVVODug0awxCg_gl2Mm0NLvvBKfX4-7rnPyU5ICFnCOJ9o-SBBdx2qQgk9kEY7ndzcCU4keP43BpxUTjqKY",
    auth: "5h772kLWZ6OSbEOZ9HV5FQ"
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
