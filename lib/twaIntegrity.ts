let twaPort: MessagePort | null = null;

export function initTwaPortListener() {
  if (typeof window === "undefined") return;

  window.addEventListener("message", (event) => {
    // The first message from Android contains the port
    const port = event.ports?.[0];
    if (!port) return;

    twaPort = port;

    // Optional debug listener
    twaPort.onmessage = () => {
      // console.log("[TWA port] message:", ev.data);
    };
  });
}

export async function requestIntegrityTokenFromTwa(timeoutMs = 8000): Promise<string> {
  const port = twaPort; // ✅ capture once so TS knows it's not null
  if (!port) throw new Error("TWA MessagePort not ready yet");

  const nonce = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      port.removeEventListener("message", onMessage as any);
      reject(new Error("Timed out waiting for integrity token"));
    }, timeoutMs);

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;

      if (data?.type === "INTEGRITY_TOKEN" && data?.nonce === nonce && typeof data?.token === "string") {
        clearTimeout(timeout);
        port.removeEventListener("message", onMessage as any);
        resolve(data.token);
      }

      // Optional: if you send INTEGRITY_ERROR from Android, handle it
      if (data?.type === "INTEGRITY_ERROR" && data?.nonce === nonce) {
        clearTimeout(timeout);
        port.removeEventListener("message", onMessage as any);
        reject(new Error(data?.error || "Integrity error"));
      }
    };

    // Listen only for the response to this request
    port.addEventListener("message", onMessage as any);

    // Send nonce request to Android
    port.postMessage({ type: "INTEGRITY_NONCE", nonce });
  });
}
