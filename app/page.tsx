// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import SocialShareBar from "@/app/components/SocialShareBar";
import { useT } from "@/lib/useT";

// Tool cards used in the "What you get" section
const TOOL_CARDS = [
  {
    slug: "/dashboard",
    emoji: "📊",
    labelKey: "tools.dashboard.label",
    labelFallback: "Dashboard overview",
    taglineKey: "tools.dashboard.tagline",
    taglineFallback: "See your day, score, and focus in one place.",
    descriptionKey: "tools.dashboard.description",
    descriptionFallback:
      "Your home base: daily success score, focus for today, quick links to tasks, notes and weekly progress.",
    highlights: [
      {
        key: "tools.dashboard.highlight1",
        fallback: "Today at a glance",
      },
      {
        key: "tools.dashboard.highlight2",
        fallback: "Daily Success score & trend",
      },
      {
        key: "tools.dashboard.highlight3",
        fallback: "Quick access to all tools",
      },
    ],
    ctaKey: "tools.dashboard.cta",
    ctaFallback: "Open dashboard",
  },
  {
    slug: "/notes",
    emoji: "📝",
    labelKey: "tools.notes.label",
    labelFallback: "Notes & AI workspace",
    taglineKey: "tools.notes.tagline",
    taglineFallback: "Capture ideas, drafts and progress logs.",
    descriptionKey: "tools.notes.description",
    descriptionFallback:
      "Keep everything in one place and let AI summarize, clean up or extract tasks from your notes.",
    highlights: [
      {
        key: "tools.notes.highlight1",
        fallback: "Fast note capture",
      },
      {
        key: "tools.notes.highlight2",
        fallback: "AI summaries & clean-ups",
      },
      {
        key: "tools.notes.highlight3",
        fallback: "Great for journaling & meeting notes",
      },
    ],
    ctaKey: "tools.notes.cta",
    ctaFallback: "Go to Notes",
  },
  {
    slug: "/tasks",
    emoji: "✅",
    labelKey: "tools.tasks.label",
    labelFallback: "Tasks & reminders",
    taglineKey: "tools.tasks.tagline",
    taglineFallback: "Simple task list with real reminders.",
    descriptionKey: "tools.tasks.description",
    descriptionFallback:
      "Add tasks with due dates, time windows, categories and per-task reminders that can trigger email + push.",
    highlights: [
      {
        key: "tools.tasks.highlight1",
        fallback: "Time-boxed tasks with categories",
      },
      {
        key: "tools.tasks.highlight2",
        fallback: "Reminders via email & push",
      },
      {
        key: "tools.tasks.highlight3",
        fallback: "Share tasks to WhatsApp, Viber, email",
      },
    ],
    ctaKey: "tools.tasks.cta",
    ctaFallback: "Open Tasks",
  },
  {
    slug: "/ai-task-creator",
    emoji: "🤖",
    labelKey: "tools.aiTaskCreator.label",
    labelFallback: "AI Task Creator",
    taglineKey: "tools.aiTaskCreator.tagline",
    taglineFallback: "Turn vague goals into clear steps.",
    descriptionKey: "tools.aiTaskCreator.description",
    descriptionFallback:
      "Paste a messy goal and let AI break it into small, prioritized tasks you can send straight into your board.",
    highlights: [
      {
        key: "tools.aiTaskCreator.highlight1",
        fallback: "Turns goals into checklists",
      },
      {
        key: "tools.aiTaskCreator.highlight2",
        fallback: "Smart priorities & time hints",
      },
      {
        key: "tools.aiTaskCreator.highlight3",
        fallback: "Works great with your Tasks page",
      },
    ],
    ctaKey: "tools.aiTaskCreator.cta",
    ctaFallback: "Use AI Task Creator",
  },
  {
    slug: "/weekly-history",
    emoji: "📬",
    labelKey: "tools.weeklyReports.label",
    labelFallback: "Weekly AI reports",
    taglineKey: "tools.weeklyReports.tagline",
    taglineFallback: "A lightweight review written for you by AI.",
    descriptionKey: "tools.weeklyReports.description",
    descriptionFallback:
      "See how your week went, what worked, and what to focus on next — powered by your scores, tasks and notes.",
    highlights: [
      {
        key: "tools.weeklyReports.highlight1",
        fallback: "Weekly score & streak view",
      },
      {
        key: "tools.weeklyReports.highlight2",
        fallback: "Highlights wins & bottlenecks",
      },
      {
        key: "tools.weeklyReports.highlight3",
        fallback: "Focus suggestions for next week",
      },
    ],
    ctaKey: "tools.weeklyReports.cta",
    ctaFallback: "View weekly history",
  },
  {
    slug: "/settings",
    emoji: "🎛️",
    labelKey: "tools.settings.label",
    labelFallback: "Notifications & themes",
    taglineKey: "tools.settings.tagline",
    taglineFallback: "Make the app feel like your own.",
    descriptionKey: "tools.settings.description",
    descriptionFallback:
      "Control email digests, push reminders, timezone and themes — including seasonal looks like Halloween or Christmas.",
    highlights: [
      {
        key: "tools.settings.highlight1",
        fallback: "Email & push reminder controls",
      },
      {
        key: "tools.settings.highlight2",
        fallback: "Timezone & reminder cadence",
      },
      {
        key: "tools.settings.highlight3",
        fallback: "Dark, light & seasonal themes",
      },
    ],
    ctaKey: "tools.settings.cta",
    ctaFallback: "Open Settings",
  },
];

function ToolsSection() {
  const { t: translate } = useT("home");

  return (
    <section className="mb-14" id="tools">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
        {translate("tools.sectionLabel", "WHAT YOU GET")}
      </p>

      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
            {translate(
              "tools.heading",
              "A small toolkit for planning, focus and follow-through."
            )}
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            {translate(
              "tools.subheading",
              "Every page in AI Productivity Hub is a focused tool. No endless widgets — just the essentials for days, weeks and long-term goals."
            )}
          </p>
        </div>

        <Link
          href="/tools"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] md:text-xs text-[var(--text-main)] hover:bg-[var(--bg-card)]"
        >
          {translate("tools.viewAll", "View all tools")}
          <span className="ml-1 text-[10px]">→</span>
        </Link>
      </div>

      <div className="grid gap-4 md:gap-5 md:grid-cols-2">
        {TOOL_CARDS.map((tool) => (
          <article
            key={tool.slug}
            className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:p-5 hover:border-[var(--accent)]/70 hover:shadow-lg hover:shadow-black/10 transition-all"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-lg">
                <span aria-hidden="true">{tool.emoji}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-[var(--text-main)]">
                  {translate(tool.labelKey, tool.labelFallback)}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {translate(tool.taglineKey, tool.taglineFallback)}
                </p>
              </div>
            </div>

            <p className="text-xs md:text-[13px] text-[var(--text-main)] mb-3">
              {translate(tool.descriptionKey, tool.descriptionFallback)}
            </p>

            <ul className="space-y-1.5 mb-4">
              {tool.highlights.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-2 text-[11px] text-[var(--text-muted)]"
                >
                  <span className="mt-[2px] text-[var(--accent)]">•</span>
                  <span>{translate(item.key, item.fallback)}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2">
              <Link
                href={tool.slug}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs text-[var(--text-main)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
              >
                {translate(tool.ctaKey, tool.ctaFallback)}
                <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">
                  ↗
                </span>
              </Link>
              <span className="text-[10px] text-[var(--text-muted)]">
                {translate("tools.opensLabel", "Opens")},{" "}
                <code className="text-[10px] opacity-80">{tool.slug}</code>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { t: translate } = useT("home");

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
    }, []);

  const primaryCtaHref = user ? "/dashboard" : "/auth";
  const primaryCtaLabel = user
    ? translate("hero.primaryCtaLoggedIn", "Open your dashboard")
    : translate("hero.primaryCtaLoggedOut", "Start for free");

  const secondaryCtaHref = user ? "/notes" : "/auth";
  const secondaryCtaLabel = user
    ? translate("hero.secondaryCtaLoggedIn", "Go to Notes")
    : translate("hero.secondaryCtaLoggedOut", "Log in");

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active={user ? "dashboard" : undefined} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 md:pb-20 text-sm">
          {/* HERO */}
          <section className="grid md:grid-cols-[1.4fr,1fr] gap-10 md:gap-12 items-center mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] mb-4">
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  {translate("hero.badgeLabel", "New")}
                </span>
                <span className="text-[var(--text-muted)]">
                  {translate(
                    "hero.badgeText",
                    "Weekly AI reports, travel planner & daily success score"
                  )}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                {translate("hero.titlePrefix", "Your AI workspace for")}{" "}
                <span className="text-[var(--accent)]">
                  {translate("hero.titleHighlight", "focus, planning & tiny wins.")}
                </span>
              </h1>

              <p className="text-sm md:text-base text-[var(--text-muted)] mb-5 max-w-xl">
                {translate(
                  "hero.subtitle",
                  "Capture notes, plan your day, track what matters, and let AI summarize your progress."
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Link
                  href={primaryCtaHref}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)]"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs md:text-sm"
                >
                  {secondaryCtaLabel}
                </Link>
                <Link
                  href="/tools"
                  className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-card)] text-[11px] md:text-xs text-[var(--text-muted)] flex items-center gap-1"
                >
                  {translate("hero.viewAllTools", "View all tools")}
                  <span className="text-[10px]">→</span>
                </Link>
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                {translate(
                  "hero.bottomLine",
                  "No credit card required • Free plan included • Built for solo makers, students and busy humans ✨"
                )}
              </p>

              <div className="mt-5">
                <SocialShareBar
                  title={translate(
                    "hero.shareTitle",
                    "Check out this AI Productivity Hub"
                  )}
                />
              </div>
            </div>

            {/* Preview panel */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xl">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  {translate("preview.heading", "Today at a glance")}
                </p>

                <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 mb-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    {translate("preview.scoreLabel", "Productivity score")}
                  </p>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-semibold text-[var(--text-main)]">
                      78
                    </span>
                    <span className="text-[11px] text-[var(--accent)]">
                      {translate("preview.deltaText", "+12 vs yesterday")}
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                    <div className="h-full w-[78%] bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
                  <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3">
                    <p className="text-[var(--text-muted)] mb-1">
                      {translate("preview.focusLabel", "Today’s focus")}
                    </p>
                    <p className="text-[var(--text-main)]">
                      {translate(
                        "preview.focusText",
                        "Ship landing page, reply to clients, 30min learning."
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3">
                    <p className="text-[var(--text-muted)] mb-1">
                      {translate("preview.aiWinsLabel", "AI wins")}
                    </p>
                    <ul className="text-[var(--text-main)] list-disc list-inside space-y-0.5">
                      <li>
                        {translate(
                          "preview.aiWins1",
                          "Summarized 4 messy notes"
                        )}
                      </li>
                      <li>
                        {translate("preview.aiWins2", "Drafted 2 emails")}
                      </li>
                      <li>
                        {translate(
                          "preview.aiWins3",
                          "Planned tomorrow in 2 minutes"
                        )}
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  {translate(
                    "preview.note",
                    "This is a preview. Your dashboard updates live as you add content."
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* TOOLS / WHAT YOU GET */}
          <ToolsSection />

          {/* PRICING */}
          <section id="pricing" className="mb-14">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              {translate("pricing.sectionLabel", "PRICING")}
            </p>

            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {translate(
                "pricing.heading",
                "Start free. Upgrade when it becomes part of your day."
              )}
            </h2>

            <div className="grid md:grid-cols-2 gap-5 text-sm">
              {/* FREE PLAN */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                  {translate("pricing.free.label", "FREE")}
                </p>
                <p className="text-2xl font-bold mb-1 text-[var(--text-main)]">
                  {translate("pricing.free.price", "€0")}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                  {translate(
                    "pricing.free.description",
                    "Great for light usage, daily planning and basic AI help."
                  )}
                </p>

                <ul className="text-[12px] text-[var(--text-main)] space-y-1.5 mb-4">
                  <li>{translate("pricing.free.feature1", "✔ Notes")}</li>
                  <li>{translate("pricing.free.feature2", "✔ Tasks")}</li>
                  <li>
                    {translate(
                      "pricing.free.feature3",
                      "✔ Daily Success Score"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.free.feature4",
                      "✔ Weekly Goals"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.free.feature5",
                      "✔ Travel Planner (basic)"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.free.feature6",
                      "✔ 20 AI messages/day"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.free.feature7",
                      "✔ Templates (basic)"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.free.feature8",
                      "✔ Sync across devices"
                    )}
                  </li>
                </ul>

                <Link
                  href={primaryCtaHref}
                  className="mt-auto inline-flex justify-center px-4 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs font-medium border border-[var(--border-subtle)]"
                >
                  {primaryCtaLabel}
                </Link>
              </div>

              {/* PRO PLAN */}
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5 flex flex-col relative overflow-hidden">
                <p className="relative text-xs font-semibold text-[var(--accent)] mb-1">
                  {translate("pricing.pro.label", "PRO")}
                </p>

                <p className="relative text-2xl font-bold mb-1 text-[var(--text-main)]">
                  {translate("pricing.pro.priceMonthly", "€8.49 / month")}
                </p>
                <p className="relative text-sm text-[var(--text-muted)] mb-1">
                  {translate("pricing.pro.priceYearly", "€79 / year (save 25%)")}
                </p>

                <p className="relative text-[12px] text-[var(--text-muted)] mb-3">
                  {translate(
                    "pricing.pro.description",
                    "Unlimited AI, weekly reports, advanced planning tools, templates and more."
                  )}
                </p>

                <ul className="relative text-[12px] text-[var(--text-main)] space-y-1.5 mb-4">
                  <li>
                    {translate("pricing.pro.feature1", "🔥 Everything in Free")}
                  </li>
                  <li>
                    {translate(
                      "pricing.pro.feature2",
                      "🔥 Unlimited AI messages"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.pro.feature3",
                      "🔥 Weekly AI Email Report"
                    )}
                  </li>
                  <li>
                    {translate("pricing.pro.feature4", "🔥 AI Task Planning")}
                  </li>
                  <li>
                    {translate(
                      "pricing.pro.feature5",
                      "🔥 Advanced Travel Planner"
                    )}
                  </li>
                  <li>
                    {translate(
                      "pricing.pro.feature6",
                      "🔥 Unlimited Notes & Templates"
                    )}
                  </li>
                </ul>

                <Link
                  href={user ? "/dashboard" : "/auth"}
                  className="relative mt-auto inline-flex justify-center px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs font-medium text-[var(--accent-contrast)]"
                >
                  {user
                    ? translate("pricing.pro.manageCta", "Manage your plan")
                    : translate(
                        "pricing.pro.upgradeCta",
                        "Upgrade when you're ready"
                      )}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              {translate("faq.sectionLabel", "FAQ")}
            </p>

            <div className="space-y-4 text-sm max-w-3xl">
              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  {translate(
                    "faq.q1",
                    "Do I need to be technical to use this?"
                  )}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {translate(
                    "faq.a1",
                    "Nope — it's intentionally simple and beginner-friendly."
                  )}
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  {translate(
                    "faq.q2",
                    "What's the difference between Free and Pro?"
                  )}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {translate(
                    "faq.a2",
                    "Free covers basics. Pro unlocks unlimited AI and deeper planning tools."
                  )}
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  {translate("faq.q3", "Can I cancel anytime?")}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {translate(
                    "faq.a3",
                    "Yes! You keep your data even after cancellation."
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* BOTTOM CTA */}
          {!user && !checkingUser && (
            <section className="mb-10">
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-xs md:text-sm max-w-xl">
                <p className="text-[var(--accent)] font-semibold mb-1">
                  {translate("bottomCta.title", "Ready to give it a try?")}
                </p>

                <p className="text-[var(--text-main)] mb-3">
                  {translate(
                    "bottomCta.body",
                    "Create a free account in under a minute."
                  )}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/auth"
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] font-medium"
                  >
                    {translate(
                      "bottomCta.primary",
                      "Create free account"
                    )}
                  </Link>

                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    {translate(
                      "bottomCta.secondary",
                      "Already have an account?"
                    )}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* FOOTER */}
          <footer className="border-t border-[var(--border-subtle)] pt-4 pb-2 text-[11px] text-[var(--text-muted)] flex flex-wrap gap-3 justify-between">
            <span>
              © {new Date().getFullYear()}{" "}
              {translate(
                "footer.ownerLine",
                "AI Productivity Hub — aiprod.app — Owner: AlphaSynth AI"
              )}
            </span>

            <div className="flex gap-3">
              <Link
                href="/changelog"
                className="hover:text-[var(--text-main)]"
              >
                {translate("footer.changelogLink", "What's new")}
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-[var(--text-main)]"
              >
                {translate("footer.privacyLink", "Privacy")}
              </Link>
              <Link
                href="/terms"
                className="hover:text-[var(--text-main)]"
              >
                {translate("footer.termsLink", "Terms")}
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
