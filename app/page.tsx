// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import SocialShareBar from "@/app/components/SocialShareBar";
import { useT } from "@/lib/useT";

type FeatureCard = {
  slug: string;
  iconKey: string;
  iconFallback: string;
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  bulletKeys: { key: string; fallback: string }[];
  ctaKey: string;
  ctaFallback: string;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    slug: "/dashboard",
    iconKey: "home.features.dashboard.icon",
    iconFallback: "📊",
    titleKey: "home.features.dashboard.title",
    titleFallback: "Dashboard overview",
    subtitleKey: "home.features.dashboard.subtitle",
    subtitleFallback: "See your day, score, and focus in one place.",
    descriptionKey: "home.features.dashboard.description",
    descriptionFallback:
      "Your home base: daily success score, focus for today, quick links to tasks, notes and weekly progress.",
    bulletKeys: [
      { key: "home.features.dashboard.bullet1", fallback: "Today at a glance" },
      { key: "home.features.dashboard.bullet2", fallback: "Daily Success score & trend" },
      { key: "home.features.dashboard.bullet3", fallback: "Quick access to all tools" },
    ],
    ctaKey: "home.features.dashboard.cta",
    ctaFallback: "Open dashboard",
  },
  {
    slug: "/notes",
    iconKey: "home.features.notes.icon",
    iconFallback: "📝",
    titleKey: "home.features.notes.title",
    titleFallback: "Notes & AI workspace",
    subtitleKey: "home.features.notes.subtitle",
    subtitleFallback: "Capture ideas, drafts and progress logs.",
    descriptionKey: "home.features.notes.description",
    descriptionFallback:
      "Keep everything in one place and let AI summarize, clean up or extract tasks from your notes.",
    bulletKeys: [
      { key: "home.features.notes.bullet1", fallback: "Fast note capture" },
      { key: "home.features.notes.bullet2", fallback: "AI summaries & clean-ups" },
      { key: "home.features.notes.bullet3", fallback: "Great for journaling & meeting notes" },
    ],
    ctaKey: "home.features.notes.cta",
    ctaFallback: "Go to Notes",
  },
  {
    slug: "/tasks",
    iconKey: "home.features.tasks.icon",
    iconFallback: "✅",
    titleKey: "home.features.tasks.title",
    titleFallback: "Tasks & reminders",
    subtitleKey: "home.features.tasks.subtitle",
    subtitleFallback: "Simple task list with real reminders.",
    descriptionKey: "home.features.tasks.description",
    descriptionFallback:
      "Add tasks with due dates, time windows, categories and per-task reminders that can trigger email + push.",
    bulletKeys: [
      { key: "home.features.tasks.bullet1", fallback: "Time-boxed tasks with categories" },
      { key: "home.features.tasks.bullet2", fallback: "Reminders via email & push" },
      { key: "home.features.tasks.bullet3", fallback: "Share tasks to WhatsApp, Viber, email" },
    ],
    ctaKey: "home.features.tasks.cta",
    ctaFallback: "Open Tasks",
  },
  {
    slug: "/ai-task-creator",
    iconKey: "home.features.creator.icon",
    iconFallback: "🤖",
    titleKey: "home.features.creator.title",
    titleFallback: "AI Task Creator",
    subtitleKey: "home.features.creator.subtitle",
    subtitleFallback: "Turn vague goals into clear steps.",
    descriptionKey: "home.features.creator.description",
    descriptionFallback:
      "Paste a messy goal and let AI break it into small, prioritized tasks you can send straight into your board.",
    bulletKeys: [
      { key: "home.features.creator.bullet1", fallback: "Turns goals into checklists" },
      { key: "home.features.creator.bullet2", fallback: "Smart priorities & time hints" },
      { key: "home.features.creator.bullet3", fallback: "Works great with your Tasks page" },
    ],
    ctaKey: "home.features.creator.cta",
    ctaFallback: "Use AI Task Creator",
  },
  {
    slug: "/weekly-history",
    iconKey: "home.features.weekly.icon",
    iconFallback: "📬",
    titleKey: "home.features.weekly.title",
    titleFallback: "Weekly AI reports",
    subtitleKey: "home.features.weekly.subtitle",
    subtitleFallback: "A lightweight review written for you by AI.",
    descriptionKey: "home.features.weekly.description",
    descriptionFallback:
      "See how your week went, what worked, and what to focus on next — powered by your scores, tasks and notes.",
    bulletKeys: [
      { key: "home.features.weekly.bullet1", fallback: "Weekly score & streak view" },
      { key: "home.features.weekly.bullet2", fallback: "Highlights wins & bottlenecks" },
      { key: "home.features.weekly.bullet3", fallback: "Focus suggestions for next week" },
    ],
    ctaKey: "home.features.weekly.cta",
    ctaFallback: "View weekly history",
  },
  {
    slug: "/settings",
    iconKey: "home.features.settings.icon",
    iconFallback: "🎛️",
    titleKey: "home.features.settings.title",
    titleFallback: "Notifications & themes",
    subtitleKey: "home.features.settings.subtitle",
    subtitleFallback: "Make the app feel like your own.",
    descriptionKey: "home.features.settings.description",
    descriptionFallback:
      "Control email digests, push reminders, timezone and themes — including seasonal looks like Halloween or Christmas.",
    bulletKeys: [
      { key: "home.features.settings.bullet1", fallback: "Email & push reminder controls" },
      { key: "home.features.settings.bullet2", fallback: "Timezone & reminder cadence" },
      { key: "home.features.settings.bullet3", fallback: "Dark, light & seasonal themes" },
    ],
    ctaKey: "home.features.settings.cta",
    ctaFallback: "Open Settings",
  },
];

function ToolsSection() {
  const { t } = useT();

  return (
    <section className="mb-14" id="tools">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
        {t("home.features.sectionTitle", "WHAT YOU GET")}
      </p>

      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
            {t("home.features.tagline", "A small toolkit for planning, focus and follow-through.")}
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
            {t(
              "home.features.description",
              "Every page in AI Productivity Hub is a focused tool. No endless widgets — just the essentials for days, weeks and long-term goals."
            )}
          </p>
        </div>

        <Link
          href="/tools"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] md:text-xs text-[var(--text-main)] hover:bg-[var(--bg-card)]"
        >
          {t("home.features.viewTools", "View all tools")}
          <span className="ml-1 text-[10px]">{t("home.features.viewTools.arrow", "→")}</span>
        </Link>
      </div>

      <div className="grid gap-4 md:gap-5 md:grid-cols-2">
        {FEATURE_CARDS.map((card) => (
          <article
            key={card.slug}
            className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:p-5 hover:border-[var(--accent)]/70 hover:shadow-lg hover:shadow-black/10 transition-all"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-lg">
                <span aria-hidden="true">{t(card.iconKey, card.iconFallback)}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-[var(--text-main)]">
                  {t(card.titleKey, card.titleFallback)}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {t(card.subtitleKey, card.subtitleFallback)}
                </p>
              </div>
            </div>

            <p className="text-xs md:text-[13px] text-[var(--text-main)] mb-3">
              {t(card.descriptionKey, card.descriptionFallback)}
            </p>

            <ul className="space-y-1.5 mb-4">
              {card.bulletKeys.map((b) => (
                <li key={b.key} className="flex items-start gap-2 text-[11px] text-[var(--text-muted)]">
                  <span className="mt-[2px] text-[var(--accent)]">•</span>
                  <span>{t(b.key, b.fallback)}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2">
              <Link
                href={card.slug}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs text-[var(--text-main)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
              >
                {t(card.ctaKey, card.ctaFallback)}
                <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">↗</span>
              </Link>

              <span className="text-[10px] text-[var(--text-muted)]">
                <code className="text-[10px] opacity-80">{card.slug}</code>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** ✅ Promo banner for “hidden” capabilities */
function PromoHighlights({ isAuthed }: { isAuthed: boolean }) {
  const { t } = useT();

  const primaryHref = isAuthed ? "/notes" : "/auth";
  const secondaryHref = isAuthed ? "/settings" : "/auth";

  const chips = useMemo(
    () => [
      {
        icon: "🎙️",
        title: t("home.promo.voice.title", "Voice capture + AI cleanup"),
        desc: t("home.promo.voice.line1", "Record inside Notes → AI cleans the text and suggests tasks + reminders."),
        href: "/notes",
      },
      {
        icon: "🧠",
        title: t("home.promo.extract.title", "Create tasks from notes"),
        desc: t("home.promo.extract.line1", "One click to turn paragraphs into actionable tasks."),
        href: "/notes",
      },
      {
        icon: "⏰",
        title: t("home.promo.reminders.title", "Reminders that actually help"),
        desc: t("home.promo.reminders.line1", "Per-task reminders + daily/weekly emails so nothing slips."),
        href: "/tasks",
      },
      {
        icon: "🌍",
        title: t("home.promo.languages.titleShort", "26 languages"),
        desc: t("home.promo.languages.line1", "UI + translated emails based on your default language."),
        href: "/settings",
      },
      {
        icon: "⚡",
        title: t("home.promo.creator.title", "AI Task Creator"),
        desc: t("home.promo.planner.line1", "Turn a messy goal into a clean step-by-step plan."),
        href: "/ai-task-creator",
      },
      {
        icon: "💬",
        title: t("home.promo.chat.title", "AIHub Chat"),
        desc: t("home.promo.aihub.line1", "Ask for help, summarize, translate, draft — right inside the app."),
        href: "/ai-chat",
      },
    ],
    [t]
  );

  return (
    <section className="mb-14">
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 md:p-6 shadow-lg shadow-black/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
              {t("home.promo.kicker", "HIDDEN SUPERPOWERS")}
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
              {t("home.promo.title", "Capture → Clean up → Turn into tasks → Get reminded.")}
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
              {t(
                "home.promo.subtitle",
                "Voice notes, AI cleanup, task suggestions with reminders, multi-language UI, and translated email digests — all in one place."
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={primaryHref}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs font-medium text-[var(--accent-contrast)]"
            >
              {t("home.promo.tryNotes", "Try it in Notes")}
            </Link>

            <Link
              href={secondaryHref}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs"
            >
              {t("home.promo.setLanguage", "Set your language")}
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {chips.map((c) => (
            <Link
              key={c.title}
              href={isAuthed ? c.href : "/auth"}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 hover:bg-[var(--bg-card)] hover:border-[var(--accent)]/70 transition"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-subtle)] flex items-center justify-center text-lg">
                  <span aria-hidden="true">{c.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-main)]">{c.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{c.desc}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--accent)]">
                    <span className="font-medium">{t("home.promo.open", "Open")}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-[var(--text-muted)]">
          {t("home.promo.tip", "Tip: Use Voice capture in Notes to instantly get cleaned text + suggested tasks (with reminders).")}
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { t } = useT();

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
  const primaryCtaLabel = t("home.hero.cta.dashboard", "Open your dashboard");

  const secondaryCtaHref = user ? "/notes" : "/auth";
  const secondaryCtaLabel = t("home.hero.cta.notes", "Go to Notes");

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
                  {t("home.hero.newBadge", "New")}
                </span>
                <span className="text-[var(--text-muted)]">
                  {t("home.hero.tagline", "Weekly AI reports, travel planner & daily success score")}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                {t("home.hero.heading", "Your AI workspace for focus, planning & tiny wins.")}
              </h1>

              <p className="text-sm md:text-base text-[var(--text-muted)] mb-5 max-w-xl">
                {t("home.hero.subheading", "Capture notes, plan your day, track what matters, and let AI summarize your progress.")}
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
                  href="/pricing"
                  className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-card)] text-[11px] md:text-xs text-[var(--text-muted)] flex items-center gap-1"
                >
                  {t("home.hero.cta.pricing", "Pricing")}
                  <span className="text-[10px]">→</span>
                </Link>

                <Link
                  href="/tools"
                  className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-card)] text-[11px] md:text-xs text-[var(--text-muted)] flex items-center gap-1"
                >
                  {t("home.hero.cta.tools", "View all tools")}
                  <span className="text-[10px]">→</span>
                </Link>
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                {t("home.hero.noCard", "No credit card required • Free plan included • Built for solo makers, students and busy humans ✨")}
              </p>

              <div className="mt-5">
                <SocialShareBar
                  title={t("home.hero.subheading", "Capture notes, plan your day, track what matters, and let AI summarize your progress.")}
                />
              </div>
            </div>

            {/* Preview panel */}
            {/* Hero Illustration */}
            <div className="hidden md:block relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-[var(--border-subtle)]">
                <img
                  src="/images/hero-3d.png?v=1"
                  alt="AI Productivity Dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Decorative elements behind */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
            </div>
          </section>

          {/* ✅ PROMO / AD BANNER */}
          {!checkingUser && <PromoHighlights isAuthed={!!user} />}

          {/* TOOLS / WHAT YOU GET */}
          <ToolsSection />

          {/* ✅ PRICING TEASER (pricing moved to /pricing) */}
          <section className="mb-14" id="pricing">
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 md:p-6">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                {t("home.pricing.heading", "PRICING")}
              </p>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
                    {t("home.pricing.subtitle", "Start free. Upgrade when it becomes part of your day.")}
                  </h2>
                  <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
                    {t(
                      "home.pricing.teaser",
                      "Pricing is now on a dedicated page so people can choose Monthly vs Yearly (and currency) without cluttering the homepage."
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/pricing"
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)]"
                  >
                    {t("home.pricing.cta", "View pricing")}
                  </Link>

                  <Link
                    href={user ? "/dashboard" : "/auth"}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs md:text-sm"
                  >
                    {t("home.pricing.cta.secondary", "Open dashboard")}
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-3 text-[12px]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-semibold">{t("home.pricing.teaser.freeTitle", "Free plan")}</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("home.pricing.teaser.freeDesc", "Notes + Tasks + reminders basics + 10 AI calls/day.")}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-semibold">{t("home.pricing.teaser.proTitle", "Pro")}</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("home.pricing.teaser.proDesc", "Unlimited AI for normal use + Weekly AI reports + advanced planning.")}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-semibold">{t("home.pricing.teaser.cancelTitle", "Cancel anytime")}</p>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("home.pricing.teaser.cancelDesc", "Keep your data even if you downgrade.")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">{t("home.faq.title", "FAQ")}</p>

            <div className="space-y-4 text-sm max-w-3xl">
              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  {t("home.faq.q1", "Do I need to be technical to use this?")}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {t("home.faq.a1", "Nope — it's intentionally simple and beginner-friendly.")}
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  {t("home.faq.q2", "What's the difference between Free and Pro?")}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {t("home.faq.a2", "Free covers basics. Pro unlocks unlimited AI and deeper planning tools.")}
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">{t("home.faq.q3", "Can I cancel anytime?")}</p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {t("home.faq.a3", "Yes! You keep your data even after cancellation.")}
                </p>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-[var(--border-subtle)] pt-4 pb-2 text-[11px] text-[var(--text-muted)] flex flex-wrap gap-3 justify-between">
            <span>{t("home.footer.copyright", "© 2025 AI Productivity Hub — aiprod.app — Owner: AlphaSynth AI")}</span>

            <div className="flex gap-3">
              <Link href="/changelog" className="hover:text-[var(--text-main)]">
                {t("home.footer.whatsNew", "What's new")}
              </Link>
              <Link href="/privacy-policy" className="hover:text-[var(--text-main)]">
                {t("home.footer.privacy", "Privacy")}
              </Link>
              <Link href="/terms" className="hover:text-[var(--text-main)]">
                {t("home.footer.terms", "Terms")}
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
