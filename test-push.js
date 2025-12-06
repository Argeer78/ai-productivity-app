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
  endpoint: "https://fcm.googleapis.com/fcm/send/c69fs5zQwac:APA91bFdkFylWr9lXlAIy8-lB0djqikRbL6vbVoX47zvUZso8jK0hcbQslMN3SIXA2-QgI-rd1iE5ziAWf0VXWtQELzerO3nqzUBrvgntY3KbfWmkI4pwpJTpnqcZALSKhdL4iZDjUl5",
  keys: {
    p256dh: "BMv1VA4vtFksDrIPRCcniATt7Yb4uVASo2zmT_Oj_dJ_V9gknEgxGtxeiMccRpx4diMSlqrQsS0gwL6I1jYbc04",
    auth: "Q-GpeHVUNT7R2x-EkGQCkw"
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
