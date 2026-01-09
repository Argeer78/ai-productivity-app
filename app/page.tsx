// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Alive3DImage from "@/app/components/Alive3DImage";
import FeatureSlider from "@/app/components/FeatureSlider";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import SocialShareBar from "@/app/components/SocialShareBar";
import ThemePreviewWidget from "@/app/components/ThemePreviewWidget";
import GuidedWelcomeWizard from "@/app/components/GuidedWelcomeWizard";
import { useT } from "@/lib/useT";

// function ToolsSection() {
function ToolsSection({ onOpenWizard }: { onOpenWizard: () => void }) {
  const { t } = useT();

  const featureCards = useMemo(() => [
    {
      slug: "/dashboard",
      icon: t("home.features.dashboard.icon", "📊"),
      title: t("home.features.dashboard.title", "Dashboard overview"),
      subtitle: t("home.features.dashboard.subtitle", "See your day, score, and focus in one place."),
      description: t("home.features.dashboard.description", "Your home base: daily success score, focus for today, quick links to tasks, notes and weekly progress."),
      bullets: [
        t("home.features.dashboard.bullet1", "Today at a glance"),
        t("home.features.dashboard.bullet2", "Daily Success score & trend"),
        t("home.features.dashboard.bullet3", "Quick access to all tools"),
      ],
      cta: t("home.features.dashboard.cta", "Open dashboard"),
    },
    {
      slug: "/notes",
      icon: t("home.features.notes.icon", "📝"),
      title: t("home.features.notes.title", "Notes & AI workspace"),
      subtitle: t("home.features.notes.subtitle", "Capture ideas, drafts and progress logs."),
      description: t("home.features.notes.description", "Keep everything in one place and let AI summarize, clean up or extract tasks from your notes."),
      bullets: [
        t("home.features.notes.bullet1", "Fast note capture"),
        t("home.features.notes.bullet2", "AI summaries & clean-ups"),
        t("home.features.notes.bullet3", "Great for journaling & meeting notes"),
      ],
      cta: t("home.features.notes.cta", "Go to Notes"),
    },
    {
      slug: "/tasks",
      icon: t("home.features.tasks.icon", "✅"),
      title: t("home.features.tasks.title", "Tasks & reminders"),
      subtitle: t("home.features.tasks.subtitle", "Simple task list with real reminders."),
      description: t("home.features.tasks.description", "Add tasks with due dates, time windows, categories and per-task reminders that can trigger email + push."),
      bullets: [
        t("home.features.tasks.bullet1", "Time-boxed tasks with categories"),
        t("home.features.tasks.bullet2", "Reminders via email & push"),
        t("home.features.tasks.bullet3", "Share tasks to WhatsApp, Viber, email"),
      ],
      cta: t("home.features.tasks.cta", "Open Tasks"),
    },
    {
      slug: "/ai-task-creator",
      icon: t("home.features.creator.icon", "🤖"),
      title: t("home.features.creator.title", "AI Task Creator"),
      subtitle: t("home.features.creator.subtitle", "Turn vague goals into clear steps."),
      description: t("home.features.creator.description", "Paste a messy goal and let AI break it into small, prioritized tasks you can send straight into your board."),
      bullets: [
        t("home.features.creator.bullet1", "Turns goals into checklists"),
        t("home.features.creator.bullet2", "Smart priorities & time hints"),
        t("home.features.creator.bullet3", "Works great with your Tasks page"),
      ],
      cta: t("home.features.creator.cta", "Use AI Task Creator"),
    },
    {
      slug: "/weekly-history",
      icon: t("home.features.weekly.icon", "📬"),
      title: t("home.features.weekly.title", "Weekly AI reports"),
      subtitle: t("home.features.weekly.subtitle", "A lightweight review written for you by AI."),
      description: t("home.features.weekly.description", "See how your week went, what worked, and what to focus on next — powered by your scores, tasks and notes."),
      bullets: [
        t("home.features.weekly.bullet1", "Weekly score & streak view"),
        t("home.features.weekly.bullet2", "Highlights wins & bottlenecks"),
        t("home.features.weekly.bullet3", "Focus suggestions for next week"),
      ],
      cta: t("home.features.weekly.cta", "View weekly history"),
    },
    {
      slug: "/settings",
      icon: t("home.features.settings.icon", "🎛️"),
      title: t("home.features.settings.title", "Notifications & themes"),
      subtitle: t("home.features.settings.subtitle", "Make the app feel like your own."),
      description: t("home.features.settings.description", "Control email digests, push reminders, timezone and themes — including seasonal looks like Halloween or Christmas."),
      bullets: [
        t("home.features.settings.bullet1", "Email & push reminder controls"),
        t("home.features.settings.bullet2", "Timezone & reminder cadence"),
        t("home.features.settings.bullet3", "Dark, light & seasonal themes"),
      ],
      cta: t("home.features.settings.cta", "Open Settings"),
    },
  ], [t]);

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
        {featureCards.map((card) => (
          <article
            key={card.slug}
            className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:p-5 hover:border-[var(--accent)]/70 hover:shadow-lg hover:shadow-black/10 transition-all"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-lg">
                <span aria-hidden="true">{card.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-[var(--text-main)]">
                  {card.title}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </div>

            <p className="text-xs md:text-[13px] text-[var(--text-main)] mb-3">
              {card.description}
            </p>

            <ul className="space-y-1.5 mb-4">
              {card.bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-[var(--text-muted)]">
                  <span className="mt-[2px] text-[var(--accent)]">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2">
              <Link
                href={card.slug}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs text-[var(--text-main)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
              >
                {card.cta}
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

/** ✅ NEW: Ads Free & Multi-Platform Showcase */
function AdsFreeSection() {
  const { t } = useT();

  return (
    <section className="mb-14">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 shadow-2xl shadow-black/5">

        {/* Gradient Background Layer */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[var(--bg-elevated)] via-[var(--bg-card)] to-[var(--bg-elevated)] opacity-50" />

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold tracking-wider mb-3 border border-green-500/20">
              100% CLEAN
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
              Ads Free. Forever. <span className="hidden md:inline">🚫📢</span>
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md mx-auto md:mx-0">
              {t("home.adsfree.desc", "No trackers, no banners, no distractions. Just you and your goals, on every device you own.")}
            </p>
          </div>

          {/* Platform Icons Grid */}
          <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap opacity-90">
            <div className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                🖥️
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">Desktop</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                📱
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">iPhone</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                🤖
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">Android</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                🌐
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">Web</span>
            </div>
          </div>
        </div>
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
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          // console.warn("HomePage: getUser error or no session", error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        // console.error("HomePage: exception loading user", err);
        setUser(null);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-open wizard
  useEffect(() => {
    async function checkWizard() {
      const { data } = await supabase.auth.getSession();
      const hasSeen = localStorage.getItem("aph_wizard_completed");
      if (!data.session && !hasSeen) {
        setTimeout(() => setWizardOpen(true), 1500);
      }
    }
    checkWizard();
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

          {/* THEME PREVIEW WIDGET */}
          <div className="flex justify-center md:justify-start">
            <ThemePreviewWidget />
          </div>

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

              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-main)] to-[var(--text-main)]/70">
                Your AI workspace for focus, planning & tiny wins.
              </h1>

              <p className="text-sm md:text-base text-[var(--text-muted)] mb-5 max-w-xl">
                {t("home.hero.subheading", "Capture notes, plan your day, track what matters, and let AI summarize your progress.")}
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <button
                  onClick={() => {
                    if (user) {
                      window.location.href = "/dashboard";
                    } else {
                      setWizardOpen(true);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] active:scale-95 transition-transform"
                >
                  {user ? primaryCtaLabel : t("home.hero.getStarted", "Get started")}
                </button>

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
            <div className="relative mt-8 md:mt-0">
              <div className="relative z-10 w-full max-w-sm lg:max-w-md mx-auto">
                <Alive3DImage
                  src="/images/hero-3d.png?v=1"
                  alt="AI Productivity"
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>

              {/* Decorative elements behind */}
              <div className="absolute -top-10 right-0 md:-right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 left-0 md:-left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
            </div>
          </section>

          {/* ✅ PROMO / AD BANNER */}
          <AdsFreeSection />

          {/* 3D Feature Slider */}
          <FeatureSlider />

          {!checkingUser && <PromoHighlights isAuthed={!!user} />}

          {/* TOOLS / WHAT YOU GET */}
          <ToolsSection onOpenWizard={() => setWizardOpen(true)} />

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
                      "home.pricing.teas",
                      "Go to pricing page to check our FOUNDER & PRO prices."
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/pricing"
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] active:scale-95 transition-transform"
                  >
                    {t("home.pricing.cta", "View pricing")}
                  </Link>

                  <button
                    onClick={() => {
                      if (user) {
                        window.location.href = "/dashboard";
                      } else {
                        setWizardOpen(true);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs md:text-sm"
                  >
                    {user ? t("home.pricing.cta.secondary", "Open dashboard") : t("home.hero.getStarted", "Get started")}
                  </button>
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
      </div >
      <GuidedWelcomeWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </main >
  );
}
