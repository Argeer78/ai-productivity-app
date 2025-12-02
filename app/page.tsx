// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import SocialShareBar from "@/app/components/SocialShareBar";

export default function HomePage() {
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
  const primaryCtaLabel = user ? "Open your dashboard" : "Start for free";
  const secondaryCtaHref = user ? "/notes" : "/auth";
  const secondaryCtaLabel = user ? "Go to Notes" : "Log in";

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
                  New
                </span>
                <span className="text-[var(--text-muted)]">
                  Weekly AI reports, travel planner & daily success score
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                Your AI workspace for{" "}
                <span className="text-[var(--accent)]">
                  focus, planning & tiny wins.
                </span>
              </h1>

              <p className="text-sm md:text-base text-[var(--text-muted)] mb-5 max-w-xl">
                Capture notes, plan your day, track what matters, and let AI
                summarize your progress.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
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
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                No credit card required • Free plan included • Built for solo
                makers, students and busy humans ✨
              </p>

              <div className="mt-5">
                <SocialShareBar title="Check out this AI Productivity Hub" />
              </div>
            </div>

            {/* Preview panel */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xl">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Today at a glance
                </p>

                <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 mb-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    Productivity score
                  </p>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-semibold text-[var(--text-main)]">
                      78
                    </span>
                    <span className="text-[11px] text-[var(--accent)]">
                      +12 vs yesterday
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                    <div className="h-full w-[78%] bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
                  <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3">
                    <p className="text-[var(--text-muted)] mb-1">
                      Today&apos;s focus
                    </p>
                    <p className="text-[var(--text-main)]">
                      Ship landing page, reply to clients, 30min learning.
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3">
                    <p className="text-[var(--text-muted)] mb-1">AI wins</p>
                    <ul className="text-[var(--text-main)] list-disc list-inside space-y-0.5">
                      <li>Summarized 4 messy notes</li>
                      <li>Drafted 2 emails</li>
                      <li>Planned tomorrow in 2 minutes</li>
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  This is a preview. Your dashboard updates live as you add
                  content.
                </p>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="mb-14">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              WHAT YOU GET
            </p>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {[
                {
                  title: "📝 Notes with built-in AI",
                  desc: "Let AI clean up, summarize, or create tasks from your notes.",
                },
                {
                  title: "✅ Tasks & Daily Success",
                  desc: "A simple task list plus a daily score for momentum.",
                },
                {
                  title: "📧 Email digests & weekly report",
                  desc: "AI-written summaries of your wins and progress.",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    {f.title}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              {[
                {
                  title: "🧠 Reusable AI templates",
                  desc: "Save prompts for emails, content, journaling and more.",
                },
                {
                  title: "✈️ Travel planner & trips",
                  desc: "AI generates itineraries and pre-fills Booking.com.",
                },
                {
                  title: "🎯 Weekly goal & focus",
                  desc: "Pick one big weekly focus and track it.",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    {f.title}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="mb-14">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              PRICING
            </p>

            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Start free. Upgrade when it becomes part of your day.
            </h2>

            <div className="grid md:grid-cols-2 gap-5 text-sm">
              {/* FREE PLAN */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                  FREE
                </p>
                <p className="text-2xl font-bold mb-1 text-[var(--text-main)]">
                  €0
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                  Great for light usage, daily planning and basic AI help.
                </p>

                <ul className="text-[12px] text-[var(--text-main)] space-y-1.5 mb-4">
                  <li>✔ Notes</li>
                  <li>✔ Tasks</li>
                  <li>✔ Daily Success Score</li>
                  <li>✔ Weekly Goals</li>
                  <li>✔ Travel Planner (basic)</li>
                  <li>✔ 20 AI messages/day</li>
                  <li>✔ Templates (basic)</li>
                  <li>✔ Sync across devices</li>
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
                  PRO
                </p>

                <p className="relative text-2xl font-bold mb-1 text-[var(--text-main)]">
                  €8.49 / month
                </p>
                <p className="relative text-sm text-[var(--text-muted)] mb-1">
                  €79 / year (save 25%)
                </p>

                <p className="relative text-[12px] text-[var(--text-muted)] mb-3">
                  Unlimited AI, weekly reports, advanced planning tools, templates and
                  more.
                </p>

                <ul className="relative text-[12px] text-[var(--text-main)] space-y-1.5 mb-4">
                  <li>🔥 Everything in Free</li>
                  <li>🔥 Unlimited AI messages</li>
                  <li>🔥 Weekly AI Email Report</li>
                  <li>🔥 AI Task Planning</li>
                  <li>🔥 Advanced Travel Planner</li>
                  <li>🔥 Unlimited Notes & Templates</li>
                </ul>

                <Link
                  href={user ? "/dashboard" : "/auth"}
                  className="relative mt-auto inline-flex justify-center px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs font-medium text-[var(--accent-contrast)]"
                >
                  {user ? "Manage your plan" : "Upgrade when you're ready"}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              FAQ
            </p>

            <div className="space-y-4 text-sm max-w-3xl">
              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  Do I need to be technical to use this?
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  Nope — it&apos;s intentionally simple and beginner-friendly.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  What&apos;s the difference between Free and Pro?
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  Free covers basics. Pro unlocks unlimited AI and deeper planning tools.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--text-main)] mb-1">
                  Can I cancel anytime?
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  Yes! You keep your data even after cancellation.
                </p>
              </div>
            </div>
          </section>

          {/* BOTTOM CTA */}
          {!user && !checkingUser && (
            <section className="mb-10">
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-xs md:text-sm max-w-xl">
                <p className="text-[var(--accent)] font-semibold mb-1">
                  Ready to give it a try?
                </p>

                <p className="text-[var(--text-main)] mb-3">
                  Create a free account in under a minute.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/auth"
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] font-medium"
                  >
                    Create free account
                  </Link>

                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    Already have an account?
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* FOOTER */}
          <footer className="border-t border-[var(--border-subtle)] pt-4 pb-2 text-[11px] text-[var(--text-muted)] flex flex-wrap gap-3 justify-between">
            <span>
              © {new Date().getFullYear()} AI Productivity Hub — aiprod.app — Owner:
              AlphaSynth AI
            </span>

            <div className="flex gap-3">
              <Link
                href="/changelog"
                className="hover:text-[var(--text-main)]"
              >
                What&apos;s new
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-[var(--text-main)]"
              >
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[var(--text-main)]">
                Terms
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
