"use client";

import { useEffect } from "react";

export default function OpenInBrowserPage() {
  // Removed automatic intent redirect as it causes blank pages/errors on iOS and some Android WebViews
  // useEffect(() => { ... }, []);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>Open in your browser</h1>
      <p>
        Facebook opens links inside its own browser, which can cause issues.
      </p>
      <p>
        Tap the menu ⋮ and choose <b>“Open in browser”</b>.
      </p>
      <p style={{ marginTop: 16 }}>
        Or tap this link:
      </p>
      <a
        href="https://aiprod.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 18 }}
      >
        Open AI Productivity Hub →
      </a>
    </div>
  );
}
