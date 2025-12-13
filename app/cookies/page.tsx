// app/cookies/page.tsx
"use client";

import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

export default function CookiesPolicyPage() {
  // ✅ Use root t and build full keys so we match DB keys like "cookies.title"
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`cookies.${key}`, fallback);

  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="settings" />

      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 text-sm leading-relaxed">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {t("title", "Cookies & Tracking")}
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">
              {t("lastUpdatedLabel", "Last updated")}: {year}
            </p>
          </header>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 sm:px-5 py-5 text-[13px] leading-relaxed text-[var(--text-main)] space-y-4">
            <p>
              <strong>
                {t("appName", "AI Productivity Hub (owned by Anargyros Sgouros)")}
              </strong>{" "}
              {t(
                "intro",
                "uses a minimal amount of cookies and local storage to make the app work correctly and to understand how it is used."
              )}
            </p>

            <div>
              <h2 className="text-sm font-semibold mt-4 mb-2">
                {t("section1.title", "1. What We Use")}
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>
                    {t("section1.item1.label", "Authentication cookies / tokens")}
                  </strong>{" "}
                  – {t("section1.item1.body", "to keep you logged in securely.")}
                </li>

                <li>
                  <strong>
                    {t("section1.item2.label", "Preferences / local storage")}
                  </strong>{" "}
                  –{" "}
                  {t(
                    "section1.item2.body",
                    "to remember language, UI settings, and PWA installation state."
                  )}
                </li>

                <li>
                  <strong>{t("section1.item3.label", "Plausible Analytics")}</strong>{" "}
                  –{" "}
                  {t(
                    "section1.item3.body",
                    "privacy-friendly, cookieless analytics that collect only aggregated usage data (no individual tracking)."
                  )}
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold mt-4 mb-2">
                {t("section2.title", "2. No Advertising Cookies")}
              </h2>
              <p>
                {t(
                  "section2.body",
                  "We do not use third-party advertising cookies or trackers for targeted ads. Analytics are used only to improve the app experience."
                )}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold mt-4 mb-2">
                {t("section3.title", "3. Managing Cookies")}
              </h2>
              <p>
                {t(
                  "section3.body",
                  "You can clear cookies and local storage from your browser or device settings at any time. If you block all cookies, some features—such as login persistence—may not work correctly."
                )}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold mt-4 mb-2">
                {t("section4.title", "4. Contact")}
              </h2>
              <p className="mb-2">
                {t(
                  "section4.body",
                  "If you have questions about how we use cookies or tracking, contact us at:"
                )}
              </p>
              <p className="text-indigo-400 text-sm font-mono">hi@aiprod.app</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
