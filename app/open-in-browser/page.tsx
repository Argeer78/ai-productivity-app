"use client";

export default function OpenInBrowserPage() {
  function openInBrowser() {
    window.open(window.location.href.replace("/open-in-browser", ""), "_blank");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>
          Open in your browser
        </h1>

        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
          Facebook’s in-app browser limits performance and app features.
          For the best experience, open AI Productivity Hub in your browser.
        </p>

        <button
          onClick={openInBrowser}
          style={{
            background: "#6366f1",
            color: "#020617",
            padding: "12px 18px",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Open in browser
        </button>

        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
          Tip: Tap ⋮ → “Open in browser”
        </p>
      </div>
    </div>
  );
}
