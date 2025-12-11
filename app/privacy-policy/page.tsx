// app/privacy/page.tsx
"use client";

import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

export default function PrivacyPolicyPage() {
  const { t } = useT("privacy");
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="settings" />

      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 leading-relaxed text-sm">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {t("privacy.title", "Privacy Policy")}
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              {t("privacy.lastUpdatedLabel", "Last updated")}: {year}
            </p>
          </header>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 sm:px-5 py-5 text-[13px] leading-relaxed text-[var(--text-main)]">
            <p className="mb-4">
              {t(
                "privacy.intro",
                'This Privacy Policy explains how AI Productivity Hub (owned by Anargyros Sgouros) ("we", "our", or "the app") collects, uses, and protects your information when you use our website and services at aiprod.app and our Android app.'
              )}
            </p>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section1.title", "1. Information We Collect")}
            </h2>

            <p className="mb-2 font-semibold">
              {t("privacy.section1.1.title", "1.1 Account Information")}
            </p>
            <p className="mb-4">
              {t(
                "privacy.section1.1.body",
                "When you create an account, we collect your email address and securely store your authentication details using Supabase Authentication."
              )}
            </p>

            <p className="mb-2 font-semibold">
              {t("privacy.section1.2.title", "1.2 User-Generated Content")}
            </p>
            <p className="mb-4">
              {t(
                "privacy.section1.2.body",
                "We store the content you create in the app, such as notes, tasks, daily planner entries, trips, daily scores, weekly goals and weekly reports. This data is linked to your account and is private to you."
              )}
            </p>

            <p className="mb-2 font-semibold">
              {t("privacy.section1.3.title", "1.3 Usage & Technical Data")}
            </p>
            <p className="mb-4">
              {t(
                "privacy.section1.3.body",
                "We collect limited technical and usage information such as feature usage counts (for AI limits and productivity statistics) and anonymized analytics via Plausible Analytics. We do not use invasive tracking or third-party advertising cookies."
              )}
            </p>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section2.title", "2. How We Use Your Information")}
            </h2>
            <p className="mb-2">
              {t("privacy.section2.intro", "We use your data to:")}
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>
                {t(
                  "privacy.section2.item1",
                  "Provide the core app features (notes, tasks, planner, AI tools)"
                )}
              </li>
              <li>
                {t(
                  "privacy.section2.item2",
                  "Track your daily score and generate weekly reports"
                )}
              </li>
              <li>
                {t(
                  "privacy.section2.item3",
                  "Enforce AI usage limits based on your plan (Free / Pro)"
                )}
              </li>
              <li>
                {t(
                  "privacy.section2.item4",
                  "Process payments and manage subscriptions via Stripe"
                )}
              </li>
              <li>
                {t(
                  "privacy.section2.item5",
                  "Improve stability, performance and user experience"
                )}
              </li>
            </ul>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section3.title", "3. Data Sharing")}
            </h2>
            <p className="mb-4">
              {t(
                "privacy.section3.body",
                "We do not sell or trade your personal data. We only share data with the following service providers, as needed:"
              )}
            </p>

            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>
                <strong>Supabase</strong>{" "}
                {t(
                  "privacy.section3.item1.suffix",
                  "– authentication, database and secure data storage"
                )}
              </li>
              <li>
                <strong>Stripe</strong>{" "}
                {t(
                  "privacy.section3.item2.suffix",
                  "– payment processing and subscription billing"
                )}
              </li>
              <li>
                <strong>Plausible Analytics</strong>{" "}
                {t(
                  "privacy.section3.item3.suffix",
                  "– privacy-friendly, anonymous analytics"
                )}
              </li>
              <li>
                <strong>{t("privacy.section3.item4.label", "AI provider")}</strong>{" "}
                {t(
                  "privacy.section3.item4.suffix",
                  "– processing text you send for AI features (we do not use AI outputs for advertising or profiling)"
                )}
              </li>
            </ul>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section4.title", "4. Data Retention")}
            </h2>
            <p className="mb-4">
              {t(
                "privacy.section4.body",
                "We retain your data for as long as your account is active. When you request account deletion, we delete your personal data and associated content from our systems within a reasonable timeframe, except where we must retain limited information for legal, billing or security reasons."
              )}
            </p>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section5.title", "5. Security")}
            </h2>
            <p className="mb-4">
              {t(
                "privacy.section5.body",
                "All connections to the app use HTTPS encryption. Data is stored in Supabase with row-level security to ensure each user only has access to their own records. No system is perfectly secure, but we take reasonable measures to protect your information."
              )}
            </p>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section6.title", "6. Your Rights")}
            </h2>
            <p className="mb-4">
              {t(
                "privacy.section6.body",
                "Depending on your location, you may have rights to access, update or delete your data. You can delete your account at any time using the in-app option or by contacting us. For details, see:"
              )}
            </p>

            <p className="mb-4 text-[13px] text-indigo-400 break-all">
              https://aiprod.app/delete-account
            </p>

            <h2 className="text-sm font-semibold mt-6 mb-2">
              {t("privacy.section7.title", "7. Contact")}
            </h2>
            <p className="mb-4">
              {t(
                "privacy.section7.body",
                "If you have questions about this Privacy Policy or how we handle your data, contact us at:"
              )}
            </p>

            <p className="text-indigo-400 text-sm font-mono">
              hi@aiprod.app
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
