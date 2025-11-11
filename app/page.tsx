"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import SocialShare from "@/app/components/SocialShare";

export default function HomePage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  const loggedIn = !!user;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="text-sm font-semibold tracking-tight">
              AI Productivity Hub
            </span>
          </Link>

          <nav className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/notes"
              className="hidden sm:inline text-slate-300 hover:text-white"
            >
              Notes
            </Link>
            <Link
              href="/tasks"
              className="hidden sm:inline text-slate-300 hover:text-white"
            >
              Tasks
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline text-slate-300 hover:text-white"
            >
              Dashboard
            </Link>
  <Link
    href="/feedback"
    className="hidden sm:inline text-slate-300 hover:text-white"
  >
    💬 Feedback
  </Link>
            {!loggedIn && (
              <Link
                href="/auth"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm bg-slate-100 text-slate-900 font-medium hover:bg-white"
              >
                Log in / Sign up
              </Link>
            )}

            {loggedIn && (
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm bg-slate-100 text-slate-900 font-medium hover:bg-white"
              >
                Go to dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero + content */}
      <div className="flex-1">
        <section className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-slate-950/60">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
            <div>
              {loggedIn && !checkingUser && (
                <p className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 mb-4">
                  <span className="text-[10px]">👋</span>
                  Welcome back,{" "}
                  <span className="font-semibold">
                    {user?.email ?? "there"}
                  </span>
                </p>
              )}

              {!loggedIn && (
                <p className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-200 mb-4">
                  <span className="text-[10px]">⚡</span>
                  AI-powered notes & focus
                </p>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Turn messy notes into clear
                <span className="text-indigo-400"> action</span> in seconds.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 mb-6 max-w-xl">
                AI Productivity Hub is your lightweight workspace for capturing
                ideas, cleaning them up with AI, and turning them into tasks you
                can actually finish.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {loggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                    >
                      Go to your dashboard
                    </Link>
                    <Link
                      href="/notes"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
                    >
                      Open notes
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                    >
                      Get started free
                    </Link>
                    <Link
                      href="/notes"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
                    >
                      Explore the app
                    </Link>
                  </>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Free plan includes daily AI usage. Upgrade to Pro inside the
                app when you&apos;re ready — cancel anytime.
              </p>
              <SocialShare />
            </div>

            {/* Right side "preview" card */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl shadow-indigo-900/20 p-4 text-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 font-medium">
                    Note: Weekly planning
                  </span>
                  <span className="text-[10px] text-slate-500">
                    AI Productivity Hub
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 mb-3">
                  <p className="text-slate-300 mb-2">
                    Things I need to do this week: finish report, plan new
                    content, reply to emails, organize workspace...
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-lg border border-slate-700 text-[11px]">
                      ✨ Summarize
                    </span>
                    <span className="px-2 py-1 rounded-lg border border-slate-700 text-[11px]">
                      📋 Turn into tasks
                    </span>
                    <span className="px-2 py-1 rounded-lg border border-slate-700 text-[11px]">
                      ✍️ Rewrite
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-600/60 bg-indigo-950/40 p-3">
                  <p className="font-semibold text-slate-50 mb-1">
                    AI summary
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-200 space-y-1">
                    <li>Finish project report draft.</li>
                    <li>Plan next week&apos;s content ideas.</li>
                    <li>Clear inbox and respond to key emails.</li>
                    <li>Declutter and organize your workspace.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-slate-900">
          <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">
              Built for clarity, not chaos.
            </h2>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">📝 Smart notes</p>
                <p className="text-slate-300 text-[13px]">
                  Capture thoughts quickly and let AI organize, clean up, and
                  highlight the key points in a click.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">✨ One-click AI actions</p>
                <p className="text-slate-300 text-[13px]">
                  Summarize long text, turn it into bullet points, or rewrite it
                  in a clearer style — directly from your notes.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">✅ Tasks from text</p>
                <p className="text-slate-300 text-[13px]">
                  Turn walls of text into actionable tasks and track them on the
                  built-in Tasks page.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">🔐 Private by default</p>
                <p className="text-slate-300 text-[13px]">
                  Your notes and tasks are stored securely in your own account
                  via Supabase — only you see your content.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">🌐 Works in your browser</p>
                <p className="text-slate-300 text-[13px]">
                  No install required. Open the app on your laptop or desktop
                  and pick up where you left off.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-lg mb-1">💳 Simple upgrade path</p>
                <p className="text-slate-300 text-[13px]">
                  Start free. When AI becomes part of your daily workflow, go
                  Pro in a few clicks using Stripe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Simple pricing teaser */}
        <section className="border-b border-slate-900 bg-slate-950/60">
          <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              Start free. Upgrade when it pays for itself.
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  FREE PLAN
                </p>
                <p className="text-2xl font-bold mb-2">$0</p>
                <p className="text-slate-300 text-[13px] mb-4">
                  Perfect to try the app and add AI to your daily note-taking.
                  No credit card required.
                </p>
                <ul className="text-[13px] text-slate-300 space-y-1 mb-4">
                  <li>• Email login</li>
                  <li>• Notes & basic AI actions</li>
                  <li>• Limited AI usage per day</li>
                  <li>• Tasks page for simple to-dos</li>
                </ul>
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs sm:text-sm"
                >
                  Create free account
                </Link>
              </div>

              <div className="rounded-2xl border border-indigo-500/70 bg-indigo-950/40 p-5">
                <p className="text-xs font-semibold text-indigo-200 mb-1">
                  PRO PLAN
                </p>
                <p className="text-2xl font-bold mb-2">
                  €9.99
                  <span className="text-base text-slate-300">/month</span>
                </p>
                <p className="text-slate-100 text-[13px] mb-4">
                  For people who use AI to think, plan, and write every day.
                  Designed to be cheaper than one takeaway coffee a month.
                </p>
                <ul className="text-[13px] text-slate-100 space-y-1 mb-4">
                  <li>• Much higher daily AI limits</li>
                  <li>• Faster workflow for notes & tasks</li>
                  <li>• Support ongoing improvements</li>
                </ul>
                <p className="text-[11px] text-indigo-100 mb-3">
                  You can upgrade securely via Stripe from inside the app on the
                  Notes or Dashboard pages.
                </p>
                <Link
                  href={loggedIn ? "/dashboard" : "/auth"}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-xs sm:text-sm text-slate-950 font-medium"
                >
                  {loggedIn ? "Manage your plan" : "Get started then upgrade"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} AI Productivity Hub. Prototype build.
          </p>
          <p className="text-[11px] text-slate-500">
            Built with Next.js, Supabase, Stripe & OpenAI.
          </p>
        </div>
      </footer>
    </main>
  );
}
