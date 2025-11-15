"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

type Props = {
  active?:
    | "dashboard"
    | "weekly-reports"
    | "explore"
    | "daily-success"
    | "notes"
    | "tasks"
    | "templates"
    | "planner"
    | "feedback"
    | "settings"
    | "admin";
};

export default function AppHeader({ active }: Props) {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  const isAdmin = user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo / App name */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight">
            AI Productivity Hub
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm">
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "dashboard" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
  href="/explore"
  className={`px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
    active === "explore" ? "border-slate-600 bg-slate-900" : ""
  }`}
>
  Explore
</Link>
          <Link
            href="/tasks"
            className={`px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "tasks" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Tasks
          </Link>
          <Link
            href="/notes"
            className={`px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "notes" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Notes
          </Link>
          <Link
            href="/daily-success"
            className={`px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "daily-success" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Daily Success
          </Link>
          <Link
            href="/templates"
            className={`hidden sm:inline px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "templates" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Templates
          </Link>
          <Link
            href="/planner"
            className={`hidden sm:inline px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "planner" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Planner
          </Link>
          <Link
            href="/feedback"
            className={`hidden sm:inline px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "feedback" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Feedback
          </Link>
          <Link
            href="/settings"
            className={`hidden sm:inline px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-900 ${
              active === "settings" ? "border-slate-600 bg-slate-900" : ""
            }`}
          >
            Settings
          </Link>

          {/* Admin link only for your email */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-xl border border-amber-500/60 text-amber-300 hover:bg-amber-500/10 ${
                active === "admin" ? "bg-amber-500/20" : ""
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
