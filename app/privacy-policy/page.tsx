// app/privacy/page.tsx
"use client";

import AppHeader from "@/app/components/AppHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader />

      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 text-sm">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            Privacy Policy
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mb-6">
            Last updated: {new Date().toISOString().split("T")[0]}
          </p>

          <div className="space-y-4 text-[13px] leading-relaxed text-slate-200">
            <p>
              AI Productivity Hub is a personal productivity tool that lets you
              capture notes, track tasks, and use AI to organize your work.
              We take your privacy seriously and try to keep data collection
              to the minimum required to run the service.
            </p>

            <h2 className="text-sm font-semibold mt-4">1. Data we store</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                <span className="font-semibold">Account data:</span> your
                email address and basic profile information.
              </li>
              <li>
                <span className="font-semibold">Content:</span> notes, tasks,
                daily scores, weekly goals, and optional travel plans you
                choose to save.
              </li>
              <li>
                <span className="font-semibold">Usage data:</span> simple
                counters of how often you use AI features (for limits,
                streaks, and anonymous analytics).
              </li>
            </ul>

            <h2 className="text-sm font-semibold mt-4">
              2. How we use your data
            </h2>
            <p>
              Your data is used to provide the app’s core features: syncing
              your content, generating AI suggestions, calculating
              productivity stats, and sending optional summaries or reports
              you explicitly enable in Settings.
            </p>

            <h2 className="text-sm font-semibold mt-4">
              3. Third-party services
            </h2>
            <p>
              We use trusted third-party services for infrastructure and
              payments (for example Supabase for database/auth and Stripe for
              billing). These providers process data on our behalf and are
              subject to their own privacy policies.
            </p>

            <h2 className="text-sm font-semibold mt-4">
              4. AI and your content
            </h2>
            <p>
              When you use AI features, relevant parts of your content are
              sent to the AI provider only to generate the responses you ask
              for. We do not sell your data or use it for unrelated
              advertising.
            </p>

            <h2 className="text-sm font-semibold mt-4">
              5. Data retention & deletion
            </h2>
            <p>
              You can delete individual notes, tasks, and other content
              from inside the app. If you want your account and associated
              data fully removed, you can contact us and we&apos;ll handle a
              complete deletion where reasonably possible.
            </p>

            <h2 className="text-sm font-semibold mt-4">
              6. Contact
            </h2>
            <p>
              If you have questions about privacy, data, or security, you can
              contact us via the Feedback section in the app or the support
              email shown there.
            </p>

            <p className="text-[11px] text-slate-500 mt-4">
              This page is a simple, human-readable overview and does not
              constitute formal legal advice. If you operate this app as a
              business, you may want a lawyer to review or provide a more
              detailed policy.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
