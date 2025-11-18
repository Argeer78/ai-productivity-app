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
      } catch (err: any) {
        if (err?.name === "AuthSessionMissingError") {
          setUser(null);
        } else {
          console.error("[home] loadUser error", err);
        }
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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active={user ? "dashboard" : undefined} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 md:pb-20 text-sm">
          {/* HERO */}
          <section className="grid md:grid-cols-[1.4fr,1fr] gap-10 md:gap-12 items-center mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/60 text-[11px] mb-4">
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                  New
                </span>
                <span className="text-slate-200">
                  Weekly AI reports, travel planner & daily success score
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                Your AI workspace for{" "}
                <span className="text-indigo-400">
                  focus, planning & tiny wins.
                </span>
              </h1>

              <p className="text-sm md:text-base text-slate-300 mb-5 max-w-xl">
                Capture notes, plan your day, track what really matters, and
                let AI summarize your progress. No complexity, no noisy
                dashboard – just a calm hub that nudges you forward.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Link
                  href={primaryCtaHref}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-sm font-medium text-slate-950"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm"
                >
                  {secondaryCtaLabel}
                </Link>
              </div>

              <p className="text-[11px] text-slate-400">
                No credit card required • Free plan included • Built for
                solo makers, students and busy humans ✨
              </p>

              {/* 🌐 Social share bar */}
              <div className="mt-5">
                <SocialShareBar
                  title="Check out this AI Productivity Hub"
                  // url is optional; it can default to the current page URL
                />
              </div>
            </div>

            {/* Simple “product preview” card */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
                <p className="text-[11px] text-slate-400 mb-2">
                  Today at a glance
                </p>
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 mb-3">
                  <p className="text-xs text-slate-300 mb-1">
                    Productivity score
                  </p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-semibold text-slate-50">
                      78
                    </span>
                    <span className="text-[11px] text-emerald-300">
                      +12 vs yesterday
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full w-[78%] bg-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                    <p className="text-slate-400 mb-1">
                      Today&apos;s focus
                    </p>
                    <p className="text-slate-100">
                      Ship landing page, reply to clients, 30min learning.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                    <p className="text-slate-400 mb-1">AI wins</p>
                    <ul className="text-slate-100 list-disc list-inside space-y-0.5">
                      <li>Summarized 4 messy notes</li>
                      <li>Drafted 2 emails</li>
                      <li>Planned tomorrow in 2 minutes</li>
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  This is a preview. Your dashboard updates live as you add
                  notes, tasks, scores and trips.
                </p>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="mb-14">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              WHAT YOU GET
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  📝 Notes with built-in AI
                </p>
                <p className="text-[12px] text-slate-300">
                  Capture ideas fast, then let AI clean up, summarize, or turn
                  them into action items. No separate chat window needed.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  ✅ Tasks & Daily Success
                </p>
                <p className="text-[12px] text-slate-300">
                  Lightweight to-dos plus a daily score so you track how the
                  day felt, not just how many boxes you ticked.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  📧 Email digests & weekly report
                </p>
                <p className="text-[12px] text-slate-300">
                  Optional daily digest and AI-written weekly report with your
                  streaks, wins and focus suggestions for next week.
                </p>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  🧠 Reusable AI templates
                </p>
                <p className="text-[12px] text-slate-300">
                  Save the prompts that actually work: emails, content,
                  learning, journaling, and more.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  ✈️ Travel planner & trips
                </p>
                <p className="text-[12px] text-slate-300">
                  Plan a trip with AI, then open Booking.com with your details
                  pre-filled. Save itineraries to your account.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold mb-1">
                  🎯 Weekly goal & focus
                </p>
                <p className="text-[12px] text-slate-300">
                  Pick one goal for the week, mark it done, and see it reflected
                  in your weekly AI report (Pro).
                </p>
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="mb-14">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              PRICING
            </p>
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Start free. Upgrade if it becomes part of your day.
            </h2>

            <div className="grid md:grid-cols-2 gap-5 text-sm">
              {/* Free */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col">
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  FREE
                </p>
                <p className="text-2xl font-bold mb-1">€0</p>
                <p className="text-[12px] text-slate-300 mb-3">
                  Great for trying the workflow, light daily usage, and basic
                  AI assistance.
                </p>
                <ul className="text-[12px] text-slate-200 space-y-1.5 mb-4">
                  <li>• Notes + AI helper</li>
                  <li>• Tasks & Daily Success score</li>
                  <li>• Basic templates</li>
                  <li>• Limited daily AI calls</li>
                  <li>• Travel planner (no saving trips)</li>
                </ul>
                <Link
                  href={primaryCtaHref}
                  className="mt-auto inline-flex justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                >
                  {user ? "Open the app" : "Start for free"}
                </Link>
              </div>

              {/* Pro */}
              <div className="rounded-2xl border border-indigo-500/70 bg-indigo-950/40 p-5 flex flex-col relative overflow-hidden">
                <div className="absolute inset-x-0 -top-8 h-16 bg-gradient-to-r from-indigo-500/20 via-sky-400/10 to-fuchsia-500/20 blur-2xl pointer-events-none" />
                <p className="relative text-xs font-semibold text-indigo-100 mb-1">
                  PRO
                </p>
                <p className="relative text-2xl font-bold mb-1">
                  €9.99 / month
                </p>
                <p className="relative text-[12px] text-indigo-100 mb-3">
                  For people who actually use this daily and want room to
                  experiment with AI.
                </p>
                <ul className="relative text-[12px] text-indigo-50 space-y-1.5 mb-4">
                  <li>• Everything in Free</li>
                  <li>• Higher daily AI limits</li>
                  <li>• Weekly AI email report</li>
                  <li>• Weekly goal tracking</li>
                  <li>• Save & revisit trips</li>
                  <li>• Priority for new features</li>
                </ul>
                <Link
                  href={user ? "/dashboard" : "/auth"}
                  className="relative mt-auto inline-flex justify-center px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-xs font-medium text-slate-900"
                >
                  {user ? "Manage your plan" : "Upgrade when you're ready"}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              FAQ
            </p>
            <div className="space-y-4 text-sm max-w-3xl">
              <div>
                <p className="font-semibold text-slate-100 mb-1">
                  Do I need to be technical to use this?
                </p>
                <p className="text-[13px] text-slate-300">
                  Nope. It&apos;s intentionally simple – closer to a notebook
                  and a checklist than a complex project management tool. The AI
                  parts feel like a gentle upgrade to what you already do.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-100 mb-1">
                  What&apos;s the difference between Free and Pro?
                </p>
                <p className="text-[13px] text-slate-300">
                  Free gives you the core experience: notes, tasks, a daily
                  success score and basic AI help. Pro adds higher limits,
                  weekly email reports, weekly goals, and the ability to save
                  trip plans and get more frequent AI assistance.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-100 mb-1">
                  Can I cancel anytime?
                </p>
                <p className="text-[13px] text-slate-300">
                  Yes. You can manage your subscription yourself via the Stripe
                  billing portal inside Settings. Your notes and tasks stay in
                  your account.
                </p>
              </div>
            </div>
          </section>

          {/* Bottom CTA – only for guests */}
          {!user && !checkingUser && (
            <section className="mb-10">
              <div className="rounded-2xl border border-indigo-500/60 bg-indigo-950/40 p-4 text-xs md:text-sm max-w-xl">
                <p className="text-indigo-100 font-semibold mb-1">
                  Ready to give it a try?
                </p>
                <p className="text-indigo-100 mb-3">
                  Create a free account in under a minute. If it helps you get
                  even one more meaningful thing done per day, it&apos;s worth
                  it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/auth"
                    className="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-900 font-medium"
                  >
                    Create free account
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl border border-indigo-300/60 text-indigo-100 hover:bg-indigo-900/40"
                  >
                    Already have an account? Log in
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="border-t border-slate-900 pt-4 pb-2 text-[11px] text-slate-500 flex flex-wrap gap-3 justify-between">
            <span>© {new Date().getFullYear()} AI Productivity Hub</span>
            <div className="flex gap-3">
              <Link href="/changelog" className="hover:text-slate-300">
                What&apos;s new
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-slate-300"
              >
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-300">
                Terms
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
