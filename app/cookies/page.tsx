export default function CookiesPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-slate-200 leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">Cookies & Tracking</h1>

      <p className="mb-4 text-sm text-slate-400">
        Last updated: {new Date().getFullYear()}
      </p>

      <p className="mb-4">
        <strong>AI Productivity Hub (owned by Anargyros Sgouros)</strong> uses
        a minimal amount of cookies and local storage to make the app work
        correctly and to understand how it is used.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. What We Use</h2>
      <ul className="list-disc pl-6 mb-4">
        <li>
          <strong>Authentication cookies / tokens</strong> – to keep you logged
          in securely.
        </li>
        <li>
          <strong>Preferences / local storage</strong> – to remember language,
          UI settings, and PWA installation state.
        </li>
        <li>
          <strong>Plausible Analytics</strong> – privacy-friendly, cookieless
          analytics to see aggregated usage (no individual tracking).
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. No Advertising Cookies</h2>
      <p className="mb-4">
        We do not use third-party advertising cookies or trackers for targeted
        ads. Analytics are used solely to improve the app experience.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Managing Cookies</h2>
      <p className="mb-4">
        You can clear cookies and local storage from your browser or device
        settings at any time. If you block all cookies, some features such as
        login persistence may not work correctly.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Contact</h2>
      <p className="mb-4">
        If you have questions about how we use cookies or tracking, contact us
        at:
      </p>

      <p className="text-indigo-400 text-lg font-mono">hi@aiprod.app</p>
    </div>
  );
}
