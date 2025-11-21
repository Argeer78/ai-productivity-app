// app/privacy/page.tsx

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4 text-sm text-slate-400">
          Last updated: {year}
        </p>

        <p className="mb-4">
          This Privacy Policy explains how{" "}
          <strong>AI Productivity Hub (owned by Anargyros Sgouros)</strong>{" "}
          (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) collects,
          uses, and protects your information when you use our website and
          services at <strong>aiprod.app</strong> and our Android app.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>

        <p className="mb-2 font-semibold">1.1 Account Information</p>
        <p className="mb-4">
          When you create an account, we collect your email address and securely
          store your authentication details using Supabase Authentication.
        </p>

        <p className="mb-2 font-semibold">1.2 User-Generated Content</p>
        <p className="mb-4">
          We store the content you create in the app, such as notes, tasks, daily
          planner entries, trips, daily scores, weekly goals and weekly reports.
          This data is linked to your account and is private to you.
        </p>

        <p className="mb-2 font-semibold">1.3 Usage & Technical Data</p>
        <p className="mb-4">
          We collect limited technical and usage information such as feature usage
          counts (for AI limits and productivity statistics) and anonymized
          analytics via Plausible Analytics. We do not use invasive tracking or
          third-party advertising cookies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. How We Use Your Information</h2>
        <p className="mb-2">We use your data to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide the core app features (notes, tasks, planner, AI tools)</li>
          <li>Track your daily score and generate weekly reports</li>
          <li>Enforce AI usage limits based on your plan (Free / Pro)</li>
          <li>Process payments and manage subscriptions via Stripe</li>
          <li>Improve stability, performance and user experience</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Data Sharing</h2>
        <p className="mb-4">
          We do <strong>not</strong> sell or trade your personal data. We only
          share data with the following service providers, as needed:
        </p>

        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Supabase</strong> – authentication, database and secure data storage
          </li>
          <li>
            <strong>Stripe</strong> – payment processing and subscription billing
          </li>
          <li>
            <strong>Plausible Analytics</strong> – privacy-friendly, anonymous analytics
          </li>
          <li>
            <strong>AI provider</strong> – processing text you send for AI features
            (we do not use AI outputs for advertising or profiling)
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. Data Retention</h2>
        <p className="mb-4">
          We retain your data for as long as your account is active. When you
          request account deletion, we delete your personal data and associated
          content from our systems within a reasonable timeframe, except where we
          must retain limited information for legal, billing or security reasons.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Security</h2>
        <p className="mb-4">
          All connections to the app use HTTPS encryption. Data is stored in
          Supabase with row-level security to ensure each user only has access to
          their own records. No system is perfectly secure, but we take reasonable
          measures to protect your information.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Your Rights</h2>
        <p className="mb-4">
          Depending on your location, you may have rights to access, update or
          delete your data. You can delete your account at any time using the
          in-app option or by contacting us. For details, see:
        </p>

        <p className="mb-4 text-indigo-400">
          https://aiprod.app/delete-account
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Contact</h2>
        <p className="mb-4">
          If you have questions about this Privacy Policy or how we handle your
          data, contact us at:
        </p>

        <p className="text-indigo-400 text-lg font-mono">
          hi@aiprod.app
        </p>
      </div>
    </div>
  );
}
