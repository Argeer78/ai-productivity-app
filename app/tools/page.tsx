// app/tools/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

type ToolKind =
  | "dashboard"
  | "chat"
  | "notes"
  | "tasks"
  | "ai-task-creator"
  | "templates"
  | "travel"
  | "planner"
  | "my-trips"
  | "daily-success"
  | "weekly-history"
  | "settings";

type ToolDef = {
  id: ToolKind;
  slug: string;
  emoji: string;
  nameKey: string;
  nameFallback: string;
  taglineKey: string;
  taglineFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  bestFor: { key: string; fallback: string }[];
  howToUse: { key: string; fallback: string }[];
  proHintKey?: string;
  proHintFallback?: string;
  ctaKey: string;
  ctaFallback: string;
};

const TOOLS: ToolDef[] = [
  {
    id: "dashboard",
    slug: "/dashboard",
    emoji: "📊",
    nameKey: "tools.dashboard.name",
    nameFallback: "Dashboard overview",
    taglineKey: "tools.dashboard.shortTagline",
    taglineFallback: "Today at a glance, plus your Daily Success score.",
    descriptionKey: "tools.dashboard.description",
    descriptionFallback:
      "The dashboard is your home base. It pulls together your daily productivity score, quick links to notes, tasks, travel planner and weekly history so you can see where you stand in a few seconds.",
    bestFor: [
      {
        key: "tools.dashboard.bestFor1",
        fallback: "Starting your day with a quick overview",
      },
      {
        key: "tools.dashboard.bestFor2",
        fallback: "Checking your Daily Success score and streak",
      },
      {
        key: "tools.dashboard.bestFor3",
        fallback:
          "Jumping into Tasks, Notes, AI Hub Chat or Weekly history from one place",
      },
    ],
    howToUse: [
      {
        key: "tools.dashboard.howToUse1",
        fallback:
          "Open the dashboard from the top navigation or from the homepage CTA.",
      },
      {
        key: "tools.dashboard.howToUse2",
        fallback:
          "Glance at your Daily Success score and trend to see how today compares to previous days.",
      },
      {
        key: "tools.dashboard.howToUse3",
        fallback:
          "Use the quick links to hop into Tasks, Notes, AI Hub Chat or Weekly history depending on what you want to work on.",
      },
    ],
    ctaKey: "tools.dashboard.cta",
    ctaFallback: "Open dashboard",
  },
  {
    id: "chat",
    slug: "/ai-chat",
    emoji: "💬",
    nameKey: "tools.chat.name",
    nameFallback: "AI Hub Chat",
    taglineKey: "tools.chat.shortTagline",
    taglineFallback: "Your general-purpose AI assistant inside the workspace.",
    descriptionKey: "tools.chat.description",
    descriptionFallback:
      "AI Hub Chat is the place to think out loud with AI. Brainstorm ideas, draft emails, ask questions, or get help with planning—all without leaving your productivity hub.",
    bestFor: [
      {
        key: "tools.chat.bestFor1",
        fallback: "Drafting emails, messages, and content quickly",
      },
      {
        key: "tools.chat.bestFor2",
        fallback: "Brainstorming ideas or breaking down problems with AI",
      },
      {
        key: "tools.chat.bestFor3",
        fallback:
          "Asking follow-up questions about plans, tasks or notes you’re working on",
      },
    ],
    howToUse: [
      {
        key: "tools.chat.howToUse1",
        fallback: "Open AI Hub Chat from the navigation bar.",
      },
      {
        key: "tools.chat.howToUse2",
        fallback:
          "Start typing what you need: a draft, an idea, an outline, or a question.",
      },
      {
        key: "tools.chat.howToUse3",
        fallback:
          "Iterate with the AI until you’re happy. You can copy results into Notes, Tasks or Templates.",
      },
      {
        key: "tools.chat.howToUse4",
        fallback:
          "Save useful prompts as Templates so you can reuse them later with one click.",
      },
    ],
    proHintKey: "tools.chat.proHint",
    proHintFallback:
      "With Pro, you can use AI Hub Chat more frequently and on longer messages, making it a genuine co-pilot for your work.",
    ctaKey: "tools.chat.cta",
    ctaFallback: "Open AI Hub Chat",
  },
  {
    id: "notes",
    slug: "/notes",
    emoji: "📝",
    nameKey: "tools.notes.name",
    nameFallback: "Notes & AI workspace",
    taglineKey: "tools.notes.shortTagline",
    taglineFallback: "Capture ideas, journal, and let AI clean things up.",
    descriptionKey: "tools.notes.description",
    descriptionFallback:
      "The Notes page gives you a clean space to write. AI can summarize, tidy messy text, translate, or pull out tasks so your notes actually turn into action.",
    bestFor: [
      {
        key: "tools.notes.bestFor1",
        fallback: "Daily journaling or end-of-day reflections",
      },
      {
        key: "tools.notes.bestFor2",
        fallback: "Meeting notes, call notes, or brain dumps",
      },
      {
        key: "tools.notes.bestFor3",
        fallback: "Creating tasks directly from notes using AI",
      },
    ],
    howToUse: [
      {
        key: "tools.notes.howToUse1",
        fallback: "Go to the Notes page from the navigation bar.",
      },
      {
        key: "tools.notes.howToUse2",
        fallback:
          "Create a new note for today or for a topic (e.g. 'Client calls', 'Ideas', 'Study notes').",
      },
      {
        key: "tools.notes.howToUse3",
        fallback:
          "Write freely. When you’re done, use the built-in AI actions to summarize, clean up, or extract tasks.",
      },
      {
        key: "tools.notes.howToUse4",
        fallback:
          "Send any extracted tasks straight into your Tasks page so you don’t lose them.",
      },
    ],
    proHintKey: "tools.notes.proHint",
    proHintFallback:
      "On Pro, you can lean on AI more heavily for longer notes, drafts, and frequent summaries without hitting limits.",
    ctaKey: "tools.notes.cta",
    ctaFallback: "Go to Notes",
  },
  {
    id: "tasks",
    slug: "/tasks",
    emoji: "✅",
    nameKey: "tools.tasks.name",
    nameFallback: "Tasks & reminders",
    taglineKey: "tools.tasks.shortTagline",
    taglineFallback: "Simple but powerful task list with reminders.",
    descriptionKey: "tools.tasks.description",
    descriptionFallback:
      "Tasks is where you turn ideas into clear, scheduled actions. Add due dates, time windows, categories and optional per-task reminders that can trigger email & browser push notifications.",
    bestFor: [
      {
        key: "tools.tasks.bestFor1",
        fallback:
          "Planning your day or week with a realistic task list",
      },
      {
        key: "tools.tasks.bestFor2",
        fallback:
          "Grouping tasks by category (Work, Personal, Health, etc.)",
      },
      {
        key: "tools.tasks.bestFor3",
        fallback:
          "Setting gentle reminders so tasks don’t disappear from your brain",
      },
    ],
    howToUse: [
      {
        key: "tools.tasks.howToUse1",
        fallback:
          "Open the Tasks page and add a new task with a short, action-based title (e.g. 'Draft landing copy', '30min walk').",
      },
      {
        key: "tools.tasks.howToUse2",
        fallback:
          "Optionally set a due date, a time window (From / To), and a category.",
      },
      {
        key: "tools.tasks.howToUse3",
        fallback:
          "If something really matters, add a reminder time. You’ll get an email and — if push is enabled — a browser notification.",
      },
      {
        key: "tools.tasks.howToUse4",
        fallback:
          "Use the view filters (Active / History / All) and category filter to stay focused on what matters right now.",
      },
    ],
    proHintKey: "tools.tasks.proHint",
    proHintFallback:
      "Combined with the AI Task Creator and weekly reports, Tasks becomes your central hub for execution.",
    ctaKey: "tools.tasks.cta",
    ctaFallback: "Open Tasks",
  },
  {
    id: "ai-task-creator",
    slug: "/ai-task-creator",
    emoji: "🤖",
    nameKey: "tools.aiTaskCreator.name",
    nameFallback: "AI Task Creator",
    taglineKey: "tools.aiTaskCreator.shortTagline",
    taglineFallback: "Turn vague goals into small, clear steps.",
    descriptionKey: "tools.aiTaskCreator.description",
    descriptionFallback:
      "The AI Task Creator is for those moments where you know what you want, but not how to break it down. Paste your goal or brain dump, and AI will propose concrete tasks you can send straight into your Tasks list.",
    bestFor: [
      {
        key: "tools.aiTaskCreator.bestFor1",
        fallback: "Breaking big projects into small, shippable steps",
      },
      {
        key: "tools.aiTaskCreator.bestFor2",
        fallback:
          "Planning a study plan, side-project, or new habit",
      },
      {
        key: "tools.aiTaskCreator.bestFor3",
        fallback:
          "Overcoming procrastination by making the next step tiny and obvious",
      },
    ],
    howToUse: [
      {
        key: "tools.aiTaskCreator.howToUse1",
        fallback:
          "Open the AI Task Creator from the navigation or from the Tasks page link.",
      },
      {
        key: "tools.aiTaskCreator.howToUse2",
        fallback:
          "Describe your goal or paste your messy notes (e.g. 'I want to redesign my website this month').",
      },
      {
        key: "tools.aiTaskCreator.howToUse3",
        fallback:
          "Ask AI to generate a list of tasks. Adjust any task titles, add / remove steps until it feels right.",
      },
      {
        key: "tools.aiTaskCreator.howToUse4",
        fallback:
          "Send the tasks you like directly into your Tasks page, with suggested priorities or time estimates.",
      },
    ],
    proHintKey: "tools.aiTaskCreator.proHint",
    proHintFallback:
      "With Pro, you can use the AI Task Creator more often and for larger projects without worrying about AI limits.",
    ctaKey: "tools.aiTaskCreator.cta",
    ctaFallback: "Use AI Task Creator",
  },
  {
    id: "templates",
    slug: "/templates",
    emoji: "📚",
    nameKey: "tools.templates.name",
    nameFallback: "AI Templates",
    taglineKey: "tools.templates.shortTagline",
    taglineFallback:
      "Reusable prompts for things you do all the time.",
    descriptionKey: "tools.templates.description",
    descriptionFallback:
      "Templates let you save your favorite prompts for emails, content, journaling, planning and more. Instead of rewriting the same instructions each time, you click a template and start from a strong base.",
    bestFor: [
      {
        key: "tools.templates.bestFor1",
        fallback: "Email replies, outreach or customer support",
      },
      {
        key: "tools.templates.bestFor2",
        fallback:
          "Content outlines, LinkedIn posts, blog ideas",
      },
      {
        key: "tools.templates.bestFor3",
        fallback:
          "Recurring journaling prompts or daily check-ins",
      },
    ],
    howToUse: [
      {
        key: "tools.templates.howToUse1",
        fallback:
          "Open the Templates page from the navigation.",
      },
      {
        key: "tools.templates.howToUse2",
        fallback:
          "Browse existing templates for emails, planning, journaling or travel—or create your own.",
      },
      {
        key: "tools.templates.howToUse3",
        fallback:
          "Fill in the small input fields (e.g. topic, audience, tone) and run the template with AI.",
      },
      {
        key: "tools.templates.howToUse4",
        fallback:
          "Save templates you like and reuse them from Notes, AI Hub Chat or directly from the Templates page.",
      },
    ],
    proHintKey: "tools.templates.proHint",
    proHintFallback:
      "With Pro, you can build a personal library of templates and run them more often without AI limits getting in the way.",
    ctaKey: "tools.templates.cta",
    ctaFallback: "Browse Templates",
  },
  {
    id: "travel",
    slug: "/travel",
    emoji: "✈️",
    nameKey: "tools.travel.name",
    nameFallback: "Travel Planner",
    taglineKey: "tools.travel.shortTagline",
    taglineFallback: "Instant AI-generated trip itineraries.",
    descriptionKey: "tools.travel.description",
    descriptionFallback:
      "Plan detailed multi-day itineraries in seconds. Get highlights, food recommendations, daily routes, budgets, and prefilled Booking.com links that you can reuse later from My Trips.",
    bestFor: [
      {
        key: "tools.travel.bestFor1",
        fallback:
          "Planning weekend trips or long holidays quickly",
      },
      {
        key: "tools.travel.bestFor2",
        fallback:
          "Getting ideas for what to see, eat and do in a new city",
      },
      {
        key: "tools.travel.bestFor3",
        fallback:
          "Creating structured daily itineraries instead of random bookmarks",
      },
    ],
    howToUse: [
      {
        key: "tools.travel.howToUse1",
        fallback:
          "Open the Travel Planner and enter your destination, dates, travel style and preferences.",
      },
      {
        key: "tools.travel.howToUse2",
        fallback:
          "Let AI generate a day-by-day itinerary with activities, food suggestions and logistics.",
      },
      {
        key: "tools.travel.howToUse3",
        fallback:
          "Edit or regenerate parts you don’t like until it feels right.",
      },
      {
        key: "tools.travel.howToUse4",
        fallback:
          "Save the trip so it appears in My Trips, where you can revisit or reuse it anytime.",
      },
    ],
    proHintKey: "tools.travel.proHint",
    proHintFallback:
      "Pro is ideal if you plan lots of trips or want richer, more detailed itineraries with multiple alternatives.",
    ctaKey: "tools.travel.cta",
    ctaFallback: "Open Travel Planner",
  },
  {
    id: "planner",
    slug: "/planner",
    emoji: "📅",
    nameKey: "tools.planner.name",
    nameFallback: "Daily Planner",
    taglineKey: "tools.planner.shortTagline",
    taglineFallback:
      "Plan your day with AI-assisted tasks & focus.",
    descriptionKey: "tools.planner.description",
    descriptionFallback:
      "Start every day with clarity. The Daily Planner helps you review your goals, create an achievable schedule, and use AI to break big goals into actionable tasks you can actually finish.",
    bestFor: [
      {
        key: "tools.planner.bestFor1",
        fallback:
          "Structuring your day when you feel overwhelmed",
      },
      {
        key: "tools.planner.bestFor2",
        fallback:
          "Turning a messy to-do list into a realistic schedule",
      },
      {
        key: "tools.planner.bestFor3",
        fallback:
          "Connecting your Daily Success score with concrete actions",
      },
    ],
    howToUse: [
      {
        key: "tools.planner.howToUse1",
        fallback:
          "Open the Daily Planner in the morning or the night before.",
      },
      {
        key: "tools.planner.howToUse2",
        fallback:
          "Write what you want to focus on and the constraints you have (meetings, energy, time).",
      },
      {
        key: "tools.planner.howToUse3",
        fallback:
          "Let AI suggest a structured plan with time blocks and priority tasks.",
      },
      {
        key: "tools.planner.howToUse4",
        fallback:
          "Send tasks directly into the Tasks page and use the Daily Success score to review how it went.",
      },
    ],
    proHintKey: "tools.planner.proHint",
    proHintFallback:
      "With Pro, you can lean on the planner more often and let AI handle bigger, more complex planning sessions.",
    ctaKey: "tools.planner.cta",
    ctaFallback: "Use Daily Planner",
  },
  {
    id: "my-trips",
    slug: "/my-trips",
    emoji: "🧳",
    nameKey: "tools.myTrips.name",
    nameFallback: "My Trips",
    taglineKey: "tools.myTrips.shortTagline",
    taglineFallback:
      "Manage and revisit all your AI-generated trips.",
    descriptionKey: "tools.myTrips.description",
    descriptionFallback:
      "All trips you generate with the Travel Planner are saved in My Trips. You can reopen any itinerary, tweak it with AI, or copy details for bookings and logistics.",
    bestFor: [
      {
        key: "tools.myTrips.bestFor1",
        fallback:
          "Keeping all your trip ideas and plans in one place",
      },
      {
        key: "tools.myTrips.bestFor2",
        fallback:
          "Reusing an old itinerary for a new trip with tweaks",
      },
      {
        key: "tools.myTrips.bestFor3",
        fallback:
          "Quickly grabbing hotel or activity suggestions you liked before",
      },
    ],
    howToUse: [
      {
        key: "tools.myTrips.howToUse1",
        fallback:
          "Open My Trips from the navigation to see all saved itineraries.",
      },
      {
        key: "tools.myTrips.howToUse2",
        fallback:
          "Click into a trip to view the full AI-generated plan.",
      },
      {
        key: "tools.myTrips.howToUse3",
        fallback:
          "Regenerate or adjust sections (e.g. food, activities) if your preferences changed.",
      },
      {
        key: "tools.myTrips.howToUse4",
        fallback:
          "Copy important details into your calendar, booking sites or share them with travel partners.",
      },
    ],
    proHintKey: "tools.myTrips.proHint",
    proHintFallback:
      "If you travel often, Pro plus My Trips becomes your personal travel library powered by AI.",
    ctaKey: "tools.myTrips.cta",
    ctaFallback: "View My Trips",
  },
  {
    id: "daily-success",
    slug: "/dashboard#daily-success",
    emoji: "🌟",
    nameKey: "tools.dailySuccess.name",
    nameFallback: "Daily Success score",
    taglineKey: "tools.dailySuccess.shortTagline",
    taglineFallback:
      "A tiny 0–100 score that tracks your days.",
    descriptionKey: "tools.dailySuccess.description",
    descriptionFallback:
      "Daily Success is a simple score that reflects how your day went based on your own subjective rating. It helps you see patterns over time without obsessing over perfection.",
    bestFor: [
      {
        key: "tools.dailySuccess.bestFor1",
        fallback:
          "Building a gentle, non-obsessive productivity habit",
      },
      {
        key: "tools.dailySuccess.bestFor2",
        fallback:
          "Seeing how your days trend across weeks and months",
      },
      {
        key: "tools.dailySuccess.bestFor3",
        fallback:
          "Connecting your mood, tasks and wins to a quick daily check-in",
      },
    ],
    howToUse: [
      {
        key: "tools.dailySuccess.howToUse1",
        fallback:
          "At the end of the day (or during your evening reflection), open the Daily Success section from the Dashboard.",
      },
      {
        key: "tools.dailySuccess.howToUse2",
        fallback:
          "Rate your day from 0–100 based on how satisfied you feel with your progress.",
      },
      {
        key: "tools.dailySuccess.howToUse3",
        fallback:
          "Optionally add a quick note about why you gave that score.",
      },
      {
        key: "tools.dailySuccess.howToUse4",
        fallback:
          "Review your scores over time via Weekly history to spot streaks, slumps and what tends to help.",
      },
    ],
    proHintKey: "tools.dailySuccess.proHint",
    proHintFallback:
      "Your Daily Success scores feed directly into your weekly AI reports, so Pro users get richer insights and better suggestions.",
    ctaKey: "tools.dailySuccess.cta",
    ctaFallback: "Update Daily Success",
  },
  {
    id: "weekly-history",
    slug: "/weekly-history",
    emoji: "📬",
    nameKey: "tools.weeklyHistory.name",
    nameFallback: "Weekly AI reports & history",
    taglineKey: "tools.weeklyHistory.shortTagline",
    taglineFallback: "See how your weeks are going over time.",
    descriptionKey: "tools.weeklyHistory.description",
    descriptionFallback:
      "Weekly history shows your past weekly AI reports, so you can see how your scores, streaks and focus areas evolved. It’s like a lightweight performance review, written for humans.",
    bestFor: [
      {
        key: "tools.weeklyHistory.bestFor1",
        fallback:
          "Reviewing your last week in a few minutes",
      },
      {
        key: "tools.weeklyHistory.bestFor2",
        fallback:
          "Spotting streaks, slumps and patterns over time",
      },
      {
        key: "tools.weeklyHistory.bestFor3",
        fallback:
          "Choosing a single focus for the upcoming week",
      },
    ],
    howToUse: [
      {
        key: "tools.weeklyHistory.howToUse1",
        fallback:
          "Open the Weekly history page from the navigation or from Settings.",
      },
      {
        key: "tools.weeklyHistory.howToUse2",
        fallback:
          "Browse previous weeks to see your scores, highlights, and suggested focus points.",
      },
      {
        key: "tools.weeklyHistory.howToUse3",
        fallback:
          "At the end of each week, skim your report and choose one key focus for the next week.",
      },
      {
        key: "tools.weeklyHistory.howToUse4",
        fallback:
          "Use those insights to adjust your tasks and Daily Success habits.",
      },
    ],
    proHintKey: "tools.weeklyHistory.proHint",
    proHintFallback:
      "Weekly AI email reports are part of Pro — you’ll get them delivered automatically to your inbox.",
    ctaKey: "tools.weeklyHistory.cta",
    ctaFallback: "View weekly history",
  },
  {
    id: "settings",
    slug: "/settings",
    emoji: "🎛️",
    nameKey: "tools.settings.name",
    nameFallback: "Settings, notifications & themes",
    taglineKey: "tools.settings.shortTagline",
    taglineFallback:
      "Control how the app talks to you and looks.",
    descriptionKey: "tools.settings.description",
    descriptionFallback:
      "Settings is where you tune the experience: AI tone, reminder cadence, email digests, push notifications, timezone and themes (including seasonal ones like Halloween or Christmas).",
    bestFor: [
      {
        key: "tools.settings.bestFor1",
        fallback:
          "Choosing a communication style for the AI (balanced, friendly, direct, etc.)",
      },
      {
        key: "tools.settings.bestFor2",
        fallback:
          "Turning daily digests and weekly reports on or off",
      },
      {
        key: "tools.settings.bestFor3",
        fallback:
          "Enabling push notifications for per-task reminders",
      },
      {
        key: "tools.settings.bestFor4",
        fallback:
          "Changing timezone and picking a theme that feels right",
      },
    ],
    howToUse: [
      {
        key: "tools.settings.howToUse1",
        fallback: "Open Settings from the navigation.",
      },
      {
        key: "tools.settings.howToUse2",
        fallback:
          "Pick your preferred AI tone so replies feel more like ‘you’.",
      },
      {
        key: "tools.settings.howToUse3",
        fallback:
          "Turn on or off the daily email digest and weekly AI reports, depending on how many emails you want to receive.",
      },
      {
        key: "tools.settings.howToUse4",
        fallback:
          "Scroll to the Task reminders (push) section to enable browser notifications and set your timezone in Notification settings.",
      },
      {
        key: "tools.settings.howToUse5",
        fallback:
          "Experiment with themes (dark, light, ocean, seasonal, etc.) until the app visually fits your taste.",
      },
    ],
    ctaKey: "tools.settings.cta",
    ctaFallback: "Open Settings",
  },
];

export default function ToolsPage() {
  const { t } = useT("tools");
  const [user, setUser] = useState<any | null>(null);
  const [, setCheckingUser] = useState(true);

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
              {t("tools.header.sectionLabel", "ALL TOOLS")}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {t(
                "tools.header.title",
                "Every tool in AI Productivity Hub, explained."
              )}
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-2xl">
              {t(
                "tools.header.subtitle",
                "Think of this as your map. Each section below is a page or feature inside the app — what it does, when to use it, and how to get the most value from it."
              )}
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
                        {t(tool.nameKey, tool.nameFallback)}
                      </h2>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {t(tool.taglineKey, tool.taglineFallback)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={tool.slug}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs hover:bg-[var(--bg-card)]"
                    >
                      {t(tool.ctaKey, tool.ctaFallback)}
                      <span className="text-[10px]">↗</span>
                    </Link>
                    <span className="hidden md:inline text-[10px] text-[var(--text-muted)]">
                      {t("tools.tool.routeLabel", "Route:")}{" "}
                      <code className="text-[10px] opacity-80">
                        {tool.slug}
                      </code>
                    </span>
                  </div>
                </div>

                <p className="text-xs md:text-[13px] text-[var(--text-main)] mb-3">
                  {t(tool.descriptionKey, tool.descriptionFallback)}
                </p>

                <div className="grid gap-4 md:grid-cols-2 text-[11px] md:text-[12px]">
                  <div>
                    <p className="font-semibold text-[var(--text-main)] mb-1">
                      {t("tools.tool.bestForTitle", "Best for")}
                    </p>
                    <ul className="space-y-1.5 text-[var(--text-muted)]">
                      {tool.bestFor.map((item) => (
                        <li
                          key={item.key}
                          className="flex gap-2 items-start"
                        >
                          <span className="mt-[2px]">•</span>
                          <span>{t(item.key, item.fallback)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text-main)] mb-1">
                      {t("tools.tool.howToUseTitle", "How to use it")}
                    </p>
                    <ol className="space-y-1.5 text-[var(--text-muted)] list-decimal list-inside">
                      {tool.howToUse.map((step) => (
                        <li key={step.key}>{t(step.key, step.fallback)}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {tool.proHintKey && tool.proHintFallback && (
                  <p className="mt-3 text-[11px] text-[var(--accent)]">
                    {t("tools.tool.proTipLabel", "Pro tip:")}{" "}
                    {t(tool.proHintKey, tool.proHintFallback)}
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
                  {t(
                    "tools.changelog.title",
                    "What’s new & release notes"
                  )}
                </p>
                <p className="text-[11px] md:text-[12px] text-[var(--text-muted)] max-w-lg">
                  {t(
                    "tools.changelog.description",
                    "Curious about new tools, improvements and bug fixes? The What’s New page (changelog) tracks how the app evolves over time."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/changelog"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] md:text-xs hover:bg-[var(--bg-card)]"
                >
                  {t("tools.changelog.cta", "View What’s New")}
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
              <span>
                {t("tools.backToHome", "← Back to homepage")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
