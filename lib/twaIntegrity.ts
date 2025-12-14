let twaPort: MessagePort | null = null;

export function initTwaPortListener() {
  if (typeof window === "undefined") return;

  window.addEventListener("message", (event) => {
    // The first message from Android contains the port
    const port = event.ports?.[0];
    if (!port) return;

    twaPort = port;

    // Optional: listen for messages on the port (debug)
    twaPort.onmessage = (ev) => {
      // console.log("[TWA port] message:", ev.data);
    };
  });
}

export async function requestIntegrityTokenFromTwa(timeoutMs = 8000): Promise<string> {
  if (!twaPort) throw new Error("TWA MessagePort not ready yet");

  const nonce = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for integrity token")), timeoutMs);

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (data?.type === "INTEGRITY_TOKEN" && data?.nonce === nonce && typeof data?.token === "string") {
        clearTimeout(timeout);
        twaPort?.removeEventListener("message", onMessage as any);
        resolve(data.token);
      }
    };

    // Listen only for the response to this request
    twaPort.addEventListener("message", onMessage as any);

    // Send nonce request to Android
    twaPort.postMessage({ type: "INTEGRITY_NONCE", nonce });
  });
}
