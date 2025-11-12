// app/page.tsx
import Link from "next/link";
import CtaButtons from "@/app/components/CtaButtons";
import ShareButtons from "@/app/components/ShareButtons";
import AppHeader from "@/app/components/AppHeader";
export const metadata = {
  title: "AI Productivity Hub — Notes, Tasks, and an AI that actually helps",
  description:
    "Capture notes, manage tasks, and let AI plan your day. Free plan available. Upgrade anytime.",
  openGraph: {
    title: "AI Productivity Hub",
    description:
      "Capture notes, manage tasks, and let AI plan your day. Free plan available. Upgrade anytime.",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Productivity Hub",
    description:
      "Capture notes, manage tasks, and let AI plan your day. Free plan available. Upgrade anytime.",
    images: ["/og-image.png"],
  },
};

export default function MarketingHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <AppHeader />

      {/* Hero */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          {/* Left column */}
          <div>
            <p className="text-xs font-semibold text-indigo-300 mb-2">NEW</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Notes, Tasks, and an AI that <span className="text-indigo-400">actually helps</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base mb-6 max-w-xl">
              Capture ideas, manage todos, and let AI summarize your week, plan your day, and unblock you.
              Start free. Upgrade anytime.
            </p>

            {/* CTAs (client) */}
            <CtaButtons />

            {/* Share (client) */}
            <div className="mt-4">
              <ShareButtons />
            </div>

            <p className="text-[12px] text-slate-500 mt-3">
              No credit card required for the Free plan.
            </p>
          </div>

          {/* Right column: simple preview cards (no background image) */}
          <div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
              <div className="grid gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400 mb-1">AI SUMMARY</p>
                  <p className="text-[12px] text-slate-200">
                    “You captured 6 notes and completed 4 tasks this week. Two themes stood out:
                    content planning and outreach. Suggested next focus: draft 2 posts and send 3 emails.”
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400 mb-1">TODAY’S PLAN</p>
                  <ul className="text-[12px] text-slate-200 list-disc pl-4 space-y-1">
                    <li>Draft product copy (30m)</li>
                    <li>Send outreach to 5 leads (45m)</li>
                    <li>Review tasks and plan tomorrow (10m)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div> 
      </section>

      {/* Features */}
      <section id="features" className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-5">
          {[
            {
              icon: "📝",
              title: "Fast notes",
              desc: "Capture and search notes instantly. Keep ideas flowing without friction.",
            },
            {
              icon: "✅",
              title: "Simple tasks",
              desc: "Lightweight task lists with due dates. No clutter, just momentum.",
            },
            {
              icon: "🧠",
              title: "AI that helps",
              desc: "Summarize weeks, plan your day, brainstorm and rewrite—all in one place.",
            },
            {
              icon: "⚡",
              title: "Daily planner",
              desc: "Turn your tasks into a focused plan with one click.",
            },
            {
              icon: "🎯",
              title: "Personalized",
              desc: "Set tone & focus area. Your AI adapts to the way you work.",
            },
            {
              icon: "🔒",
              title: "Secure",
              desc: "Email auth on Supabase. Export your data anytime.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Simple pricing</h2>
          <p className="text-slate-400 text-sm text-center mb-8">
            Start free. Upgrade when you need more AI usage.
          </p>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="font-semibold text-lg mb-1">Free</h3>
              <p className="text-slate-400 text-sm mb-4">
                Great for trying the app and light daily use.
              </p>
              <p className="text-3xl font-extrabold mb-4">€0</p>
              <ul className="text-sm text-slate-300 space-y-2 mb-5">
                <li>• Notes & Tasks</li>
                <li>• AI usage: 5 calls/day</li>
                <li>• Daily Planner (limited)</li>
                <li>• Export data (.md)</li>
              </ul>
              <Link
                href="/auth"
                className="w-full inline-block text-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
              >
                Create free account
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-indigo-500/60 bg-indigo-950/30 p-6">
              <div className="inline-block text-[11px] px-2 py-0.5 rounded-full border border-indigo-400 text-indigo-300 mb-2">
                Most popular
              </div>
              <h3 className="font-semibold text-lg mb-1">Pro</h3>
              <p className="text-slate-300 text-sm mb-4">
                Higher AI limits and access to all templates.
              </p>
              <p className="text-3xl font-extrabold mb-1">
                €9.99<span className="text-base font-medium">/mo</span>
              </p>
              <p className="text-[11px] text-slate-400 mb-4">Billed monthly. Cancel anytime.</p>
              <ul className="text-sm text-slate-200 space-y-2 mb-5">
                <li>• Everything in Free</li>
                <li>• AI usage: 50 calls/day</li>
                <li>• All AI Templates</li>
                <li>• Priority support</li>
              </ul>
              <Link
                href="/dashboard"
                className="w-full inline-block text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-950 font-medium"
              >
                Upgrade via Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">FAQ</h2>
        <div className="grid md:grid-cols-2 gap-5 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold mb-1">Is there a free plan?</h3>
              <p className="text-slate-400">Yes. You get 5 AI calls/day to try it out.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold mb-1">How does Pro work?</h3>
              <p className="text-slate-400">
                Subscribe monthly for higher AI limits and all templates. You can cancel anytime.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold mb-1">Can I export my data?</h3>
              <p className="text-slate-400">Yes. Go to Settings → Download my data (.md).</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold mb-1">Do you store my payment info?</h3>
              <p className="text-slate-400">
                Payments are handled by Stripe. We don’t store card details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-[12px] text-slate-500">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AI Productivity Hub</p>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="hover:text-slate-300">Pricing</a>
            <Link href="/feedback" className="hover:text-slate-300">Feedback</Link>
            <Link href="/settings" className="hover:text-slate-300">Settings</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
