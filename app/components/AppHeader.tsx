"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type HeaderProps = {
  active?:
    | "dashboard"
    | "notes"
    | "tasks"
    | "planner"
    | "templates"
    | "daily-success"
    | "weekly-reports"
    | "feedback"
    | "settings"
    | "admin"
    | "explore";
};

export default function AppHeader({ active }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load current user email
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[AppHeader] auth.getUser error", error);
        }
        if (!cancelled) {
          setUserEmail(data?.user?.email ?? null);
        }
      } catch (err) {
        console.error("[AppHeader] loadUser err", err);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      setUserEmail(null);
      router.push("/");
    } catch (err) {
      console.error("[AppHeader] logout error", err);
    } finally {
      setLoggingOut(false);
    }
  }

  const navLinkBase =
    "px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs sm:text-sm";
  const navLinkInactive = "text-slate-300 hover:bg-slate-900";
  const navLinkActive = "bg-slate-800 text-slate-50";

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        {/* Logo / Brand – back to landing page "/" */}
        <Link
          href="/"
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            AI Productivity Hub
          </span>
        </Link>

        {/* Desktop nav (md+) – short set on md, full set on lg */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1 min-w-0 overflow-x-auto">
          {/* Always show these (core) */}
          <Link
            href="/dashboard"
            className={`${navLinkBase} ${
              active === "dashboard" ? navLinkActive : navLinkInactive
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/notes"
            className={`${navLinkBase} ${
              active === "notes" ? navLinkActive : navLinkInactive
            }`}
          >
            Notes
          </Link>

          <Link
            href="/tasks"
            className={`${navLinkBase} ${
              active === "tasks" ? navLinkActive : navLinkInactive
            }`}
          >
            Tasks
          </Link>

          {/* Show these from md+, but hide some on smaller desktop */}
          <Link
            href="/planner"
            className={`${navLinkBase} hidden md:inline-flex ${
              active === "planner" ? navLinkActive : navLinkInactive
            }`}
          >
            Planner
          </Link>

          {/* Only show on larger screens (lg+) to keep header compact */}
          <Link
            href="/templates"
            className={`${navLinkBase} hidden lg:inline-flex ${
              active === "templates" ? navLinkActive : navLinkInactive
            }`}
          >
            Templates
          </Link>

          <Link
            href="/daily-success"
            className={`${navLinkBase} hidden lg:inline-flex ${
              active === "daily-success" ? navLinkActive : navLinkInactive
            }`}
          >
            Daily Success
          </Link>

          <Link
            href="/weekly-reports"
            className={`${navLinkBase} hidden lg:inline-flex ${
              active === "weekly-reports" ? navLinkActive : navLinkInactive
            }`}
          >
            Weekly Reports
          </Link>

          <Link
            href="/feedback"
            className={`${navLinkBase} hidden lg:inline-flex ${
              active === "feedback" ? navLinkActive : navLinkInactive
            }`}
          >
            Feedback
          </Link>
        </nav>

        {/* Right side: email + Settings + Logout – NEVER shrink */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Email */}
          {loadingUser ? (
            <span className="text-[11px] text-slate-400">Loading…</span>
          ) : userEmail ? (
            <span className="text-[11px] text-slate-300 truncate max-w-[90px] sm:max-w-[140px]">
              {userEmail}
            </span>
          ) : null}

          {/* Settings & Logout / Login */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200"
            >
              Settings
            </Link>

            {userEmail ? (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200 disabled:opacity-60"
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            ) : (
              <Link
                href="/auth"
                className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200"
              >
                Log in
              </Link>
            )}
          </div>

          {/* Mobile menu toggle (nav only) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700 hover:bg-slate-900 text-slate-200 text-xs"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu (all nav links live here on small screens) */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "dashboard" ? navLinkActive : navLinkInactive
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/notes"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "notes" ? navLinkActive : navLinkInactive
                }`}
              >
                Notes
              </Link>
              <Link
                href="/tasks"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "tasks" ? navLinkActive : navLinkInactive
                }`}
              >
                Tasks
              </Link>
              <Link
                href="/planner"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "planner" ? navLinkActive : navLinkInactive
                }`}
              >
                Planner
              </Link>
              <Link
                href="/templates"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "templates" ? navLinkActive : navLinkInactive
                }`}
              >
                Templates
              </Link>
              <Link
                href="/daily-success"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "daily-success" ? navLinkActive : navLinkInactive
                }`}
              >
                Daily Success
              </Link>
              <Link
                href="/weekly-reports"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "weekly-reports" ? navLinkActive : navLinkInactive
                }`}
              >
                Weekly Reports
              </Link>
              <Link
                href="/feedback"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "feedback" ? navLinkActive : navLinkInactive
                }`}
              >
                Feedback
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
