// app/tools/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type ToolKind =
  | "dashboard"
  | "chat"
  | "notes"
  | "tasks"
  | "ai-task-creator"
  | "templates"
  | "daily-success"
  | "weekly-history"
  | "settings";

type ToolDef = {
  id: ToolKind;
  slug: string;
  emoji: string;
  name: string;
  shortTagline: string;
  description: string;
  bestFor: string[];
  howToUse: string[];
  proHint?: string;
  ctaLabel: string;
};

const TOOLS: ToolDef[] = [
  {
    id: "dashboard",
    slug: "/dashboard",
    emoji: "📊",
    name: "Dashboard overview",
    shortTagline: "Today at a glance, plus your Daily Success score.",
    description:
      "The dashboard is your home base. It pulls together your daily productivity score, quick links to notes, tasks, travel planner and weekly history so you can see where you stand in a few seconds.",
    bestFor: [
      "Starting your day with a quick overview",
      "Checking your Daily Success score and streak",
      "Jumping into Tasks, Notes, AI Hub Chat or Weekly history from one place",
    ],
    howToUse: [
      "Open the dashboard from the top navigation or from the homepage CTA.",
      "Glance at your Daily Success score and trend to see how today compares to previous days.",
      "Use the quick links to hop into Tasks, Notes, AI Hub Chat or Weekly history depending on what you want to work on.",
    ],
    ctaLabel: "Open dashboard",
  },
  {
    id: "chat",
    slug: "/ai-chat", // adjust if your route is different, e.g. "/ai-hub"
    emoji: "💬",
    name: "AI Hub Chat",
    shortTagline: "Your general-purpose AI assistant inside the workspace.",
    description:
      "AI Hub Chat is the place to think out loud with AI. Brainstorm ideas, draft emails, ask questions, or get help with planning—all without leaving your productivity hub.",
    bestFor: [
      "Drafting emails, messages, and content quickly",
      "Brainstorming ideas or breaking down problems with AI",
      "Asking follow-up questions about plans, tasks or notes you’re working on",
    ],
    howToUse: [
      "Open AI Hub Chat from the navigation bar.",
      "Start typing what you need: a draft, an idea, an outline, or a question.",
      "Iterate with the AI until you’re happy. You can copy results into Notes, Tasks or Templates.",
      "Save useful prompts as Templates so you can reuse them later with one click.",
    ],
    proHint:
      "With Pro, you can use AI Hub Chat more frequently and on longer messages, making it a genuine co-pilot for your work.",
    ctaLabel: "Open AI Hub Chat",
  },
  {
    id: "notes",
    slug: "/notes",
    emoji: "📝",
    name: "Notes & AI workspace",
    shortTagline: "Capture ideas, journal, and let AI clean things up.",
    description:
      "The Notes page gives you a clean space to write. AI can summarize, tidy messy text, translate, or pull out tasks so your notes actually turn into action.",
    bestFor: [
      "Daily journaling or end-of-day reflections",
      "Meeting notes, call notes, or brain dumps",
      "Creating tasks directly from notes using AI",
    ],
    howToUse: [
      "Go to the Notes page from the navigation bar.",
      "Create a new note for today or for a topic (e.g. 'Client calls', 'Ideas', 'Study notes').",
      "Write freely. When you’re done, use the built-in AI actions to summarize, clean up, or extract tasks.",
      "Send any extracted tasks straight into your Tasks page so you don’t lose them.",
    ],
    proHint:
      "On Pro, you can lean on AI more heavily for longer notes, drafts, and frequent summaries without hitting limits.",
    ctaLabel: "Go to Notes",
  },
  {
    id: "tasks",
    slug: "/tasks",
    emoji: "✅",
    name: "Tasks & reminders",
    shortTagline: "Simple but powerful task list with reminders.",
    description:
      "Tasks is where you turn ideas into clear, scheduled actions. Add due dates, time windows, categories and optional per-task reminders that can trigger email & browser push notifications.",
    bestFor: [
      "Planning your day or week with a realistic task list",
      "Grouping tasks by category (Work, Personal, Health, etc.)",
      "Setting gentle reminders so tasks don’t disappear from your brain",
    ],
    howToUse: [
      "Open the Tasks page and add a new task with a short, action-based title (e.g. 'Draft landing copy', '30min walk').",
      "Optionally set a due date, a time window (From / To), and a category.",
      "If something really matters, add a reminder time. You’ll get an email and — if push is enabled — a browser notification.",
      "Use the view filters (Active / History / All) and category filter to stay focused on what matters right now.",
    ],
    proHint:
      "Combined with the AI Task Creator and weekly reports, Tasks becomes your central hub for execution.",
    ctaLabel: "Open Tasks",
  },
  {
    id: "ai-task-creator",
    slug: "/ai-task-creator",
    emoji: "🤖",
    name: "AI Task Creator",
    shortTagline: "Turn vague goals into small, clear steps.",
    description:
      "The AI Task Creator is for those moments where you know what you want, but not how to break it down. Paste your goal or brain dump, and AI will propose concrete tasks you can send straight into your Tasks list.",
    bestFor: [
      "Breaking big projects into small, shippable steps",
      "Planning a study plan, side-project, or new habit",
      "Overcoming procrastination by making the next step tiny and obvious",
    ],
    howToUse: [
      "Open the AI Task Creator from the navigation or from the Tasks page link.",
      "Describe your goal or paste your messy notes (e.g. 'I want to redesign my website this month').",
      "Ask AI to generate a list of tasks. Adjust any task titles, add / remove steps until it feels right.",
      "Send the tasks you like directly into your Tasks page, with suggested priorities or time estimates.",
    ],
    proHint:
      "With Pro, you can use the AI Task Creator more often and for larger projects without worrying about AI limits.",
    ctaLabel: "Use AI Task Creator",
  },
  {
    id: "templates",
    slug: "/templates", // adjust if you use a different route
    emoji: "📚",
    name: "AI Templates",
    shortTagline: "Reusable prompts for things you do all the time.",
    description:
      "Templates let you save your favorite prompts for emails, content, journaling, planning and more. Instead of rewriting the same instructions each time, you click a template and start from a strong base.",
    bestFor: [
      "Email replies, outreach or customer support",
      "Content outlines, LinkedIn posts, blog ideas",
      "Recurring journaling prompts or daily check-ins",
    ],
    howToUse: [
      "Open the Templates page from the navigation.",
      "Browse existing templates for emails, planning, journaling or travel—or create your own.",
      "Fill in the small input fields (e.g. topic, audience, tone) and run the template with AI.",
      "Save templates you like and reuse them from Notes, AI Hub Chat or directly from the Templates page.",
    ],
    proHint:
      "With Pro, you can build a personal library of templates and run them more often without AI limits getting in the way.",
    ctaLabel: "Browse Templates",
  },
  {
    id: "daily-success",
    slug: "/daily-success", // if you don't have a dedicated page, you can point this to "/dashboard#daily-success"
    emoji: "🌟",
    name: "Daily Success score",
    shortTagline: "A tiny 0–100 score that tracks your days.",
    description:
      "Daily Success is a simple score that reflects how your day went based on your own subjective rating. It helps you see patterns over time without obsessing over perfection.",
    bestFor: [
      "Building a gentle, non-obsessive productivity habit",
      "Seeing how your days trend across weeks and months",
      "Connecting your mood, tasks and wins to a quick daily check-in",
    ],
    howToUse: [
      "At the end of the day (or during your evening reflection), open the Daily Success section from the Dashboard or its dedicated page.",
      "Rate your day from 0–100 based on how satisfied you feel with your progress.",
      "Optionally add a quick note about why you gave that score.",
      "Review your scores over time via Weekly history to spot streaks, slumps and what tends to help.",
    ],
    proHint:
      "Your Daily Success scores feed directly into your weekly AI reports, so Pro users get richer insights and better suggestions.",
    ctaLabel: "Update Daily Success",
  },
  {
    id: "weekly-history",
    slug: "/weekly-history",
    emoji: "📬",
    name: "Weekly AI reports & history",
    shortTagline: "See how your weeks are going over time.",
    description:
      "Weekly history shows your past weekly AI reports, so you can see how your scores, streaks and focus areas evolved. It’s like a lightweight performance review, written for humans.",
    bestFor: [
      "Reviewing your last week in a few minutes",
      "Spotting streaks, slumps and patterns over time",
      "Choosing a single focus for the upcoming week",
    ],
    howToUse: [
      "Open the Weekly history page from the navigation or from Settings.",
      "Browse previous weeks to see your scores, highlights, and suggested focus points.",
      "At the end of each week, skim your report and choose one key focus for the next week.",
      "Use those insights to adjust your tasks and Daily Success habits.",
    ],
    proHint:
      "Weekly AI email reports are part of Pro — you’ll get them delivered automatically to your inbox.",
    ctaLabel: "View weekly history",
  },
  {
    id: "settings",
    slug: "/settings",
    emoji: "🎛️",
    name: "Settings, notifications & themes",
    shortTagline: "Control how the app talks to you and looks.",
    description:
      "Settings is where you tune the experience: AI tone, reminder cadence, email digests, push notifications, timezone and themes (including seasonal ones like Halloween or Christmas).",
    bestFor: [
      "Choosing a communication style for the AI (balanced, friendly, direct, etc.)",
      "Turning daily digests and weekly reports on or off",
      "Enabling push notifications for per-task reminders",
      "Changing timezone and picking a theme that feels right",
    ],
    howToUse: [
      "Open Settings from the navigation.",
      "Pick your preferred AI tone so replies feel more like ‘you’.",
      "Turn on or off the daily email digest and weekly AI reports, depending on how many emails you want to receive.",
      "Scroll to the Task reminders (push) section to enable browser notifications and set your timezone in Notification settings.",
      "Experiment with themes (dark, light, ocean, seasonal, etc.) until the app visually fits your taste.",
    ],
    ctaLabel: "Open Settings",
  },
];

export default function ToolsPage() {
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

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active={user ? "dashboard" : undefined} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 md:pb-20 text-sm">
          {/* Header */}
          <header className="mb-8 md:mb-10">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              ALL TOOLS
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Every tool in AI Productivity Hub, explained.
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-2xl">
              Think of this as your map. Each section below is a page or feature
              inside the app — what it does, when to use it, and how to get the
              most value from it.
            </p>
          </header>

          {/* Tools list */}
          <div className="space-y-5">
            {TOOLS.map((tool) => (
              <section
                key={tool.id}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 flex items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-lg">
                      <span aria-hidden="true">{tool.emoji}</span>
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-semibold text-[var(--text-main)]">
                        {tool.name}
                      </h2>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {tool.shortTagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={tool.slug}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs hover:bg-[var(--bg-card)]"
                    >
                      {tool.ctaLabel}
                      <span className="text-[10px]">↗</span>
                    </Link>
                    <span className="hidden md:inline text-[10px] text-[var(--text-muted)]">
                      Route:{" "}
                      <code className="text-[10px] opacity-80">
                        {tool.slug}
                      </code>
                    </span>
                  </div>
                </div>

                <p className="text-xs md:text-[13px] text-[var(--text-main)] mb-3">
                  {tool.description}
                </p>

                <div className="grid gap-4 md:grid-cols-2 text-[11px] md:text-[12px]">
                  <div>
                    <p className="font-semibold text-[var(--text-main)] mb-1">
                      Best for
                    </p>
                    <ul className="space-y-1.5 text-[var(--text-muted)]">
                      {tool.bestFor.map((item) => (
                        <li key={item} className="flex gap-2 items-start">
                          <span className="mt-[2px]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text-main)] mb-1">
                      How to use it
                    </p>
                    <ol className="space-y-1.5 text-[var(--text-muted)] list-decimal list-inside">
                      {tool.howToUse.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {tool.proHint && (
                  <p className="mt-3 text-[11px] text-[var(--accent)]">
                    Pro tip: {tool.proHint}
                  </p>
                )}
              </section>
            ))}
          </div>

          {/* What's new / changelog section */}
          <section className="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:p-5 text-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-main)] mb-1">
                  What&apos;s new & release notes
                </p>
                <p className="text-[11px] md:text-[12px] text-[var(--text-muted)] max-w-lg">
                  Curious about new tools, improvements and bug fixes? The
                  What&apos;s New page (changelog) tracks how the app evolves
                  over time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/changelog"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs hover:bg-[var(--bg-card)]"
                >
                  View What&apos;s New
                  <span className="text-[10px]">↗</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Back link */}
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <span>← Back to homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
