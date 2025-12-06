function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string) {
  console.log("[pushClient] subscribeToPush called for user:", userId);

  if (typeof window === "undefined") {
    console.error("[pushClient] Not in browser context");
    throw new Error("Not in browser");
  }

  // Check for service worker and push API support
  if (!("serviceWorker" in navigator)) {
    console.error("[pushClient] Service Worker unsupported");
    throw new Error("Service Worker unsupported in this browser");
  }

  if (!("PushManager" in window)) {
    console.error("[pushClient] Push API unsupported");
    throw new Error("Push notifications unsupported in this browser");
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error("[pushClient] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    throw new Error("VAPID public key is not configured");
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  console.log("[pushClient] Notification permission:", permission);

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission denied"
        : "Notification permission dismissed"
    );
  }

  // Wait for service worker to be ready
  console.log("[pushClient] Waiting for service worker to be ready…");
  const swReg = await navigator.serviceWorker.ready;
  console.log("[pushClient] Service worker ready:", swReg);

  // Check for existing subscription
  const existing = await swReg.pushManager.getSubscription();
  console.log("[pushClient] Existing subscription:", existing);

  let subscription = existing;

  if (!subscription) {
    console.log("[pushClient] No subscription, creating a new one…");
    try {
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log("[pushClient] New subscription created:", subscription);
    } catch (err) {
      console.error("[pushClient] Error creating subscription:", err);
      throw new Error("Failed to subscribe to push notifications");
    }
  } else {
    console.log("[pushClient] Reusing existing subscription");
  }

  // Send subscription to backend API
  console.log("[pushClient] Sending subscription to /api/push/subscribe …");

  let jsonResponse = null;
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, subscription }),
    });

    jsonResponse = await res.json();
    console.log("[pushClient] /api/push/subscribe response:", res.status, jsonResponse);

    if (!res.ok || !jsonResponse?.ok) {
      console.error("[pushClient] Server error during subscribe:", {
        status: res.status,
        jsonResponse,
      });
      throw new Error(jsonResponse?.error || "Push subscribe failed");
    }
  } catch (err) {
    console.error("[pushClient] Error during server subscription:", err);
    throw new Error("Failed to send subscription to server");
  }

  console.log("[pushClient] Push subscription saved successfully.");
  return true;
}
