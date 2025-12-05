// lib/pushClient.ts
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
  if (typeof window === "undefined") {
    throw new Error("Not in browser");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker unsupported in this browser");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push notifications unsupported in this browser");
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error("VAPID public key is not configured");
  }

  // Ask for notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission denied"
        : "Notification permission dismissed"
    );
  }

  // Wait for service worker to be ready
  const swReg = await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  // Send subscription to your API
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    console.error("[subscribeToPush] server error:", {
      status: res.status,
      json,
    });
    throw new Error(json?.error || "push subscribe failed");
  }

  // Success
  return true;
}
