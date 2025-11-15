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
    | "explore"
    | "changelog";
};

// 👇 update this date whenever you ship a “big enough” new changelog section
const LATEST_CHANGELOG_AT = "2025-02-15T00:00:00Z";

export default function AppHeader({ active }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  const [latestSeenChangelogAt, setLatestSeenChangelogAt] = useState<
    string | null
  >(null);

  // Load current user + profile changelog state
  useEffect(() => {
    let cancelled = false;

    async function loadUserAndProfile() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[AppHeader] auth.getUser error", error);
        }

        const user = data?.user || null;
        if (cancelled) return;

        setUserEmail(user?.email ?? null);
        setUserId(user?.id ?? null);

        if (user?.id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("latest_seen_changelog_at")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError && profileError.code !== "PGRST116") {
            console.error(
              "[AppHeader] profiles load error",
              profileError
            );
          } else if (profile?.latest_seen_changelog_at) {
            setLatestSeenChangelogAt(
              profile.latest_seen_changelog_at as string
            );
          }
        }
      } catch (err) {
        console.error("[AppHeader] loadUser err", err);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    loadUserAndProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      setUserEmail(null);
      setUserId(null);
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

  const appsItemBase =
    "flex flex-col items-start justify-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 text-xs";

  const hasUnseenChangelog =
    !latestSeenChangelogAt ||
    new Date(latestSeenChangelogAt) < new Date(LATEST_CHANGELOG_AT);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 relative">
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

        {/* Desktop nav (md+) – core links only */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1 min-w-0 overflow-x-auto">
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

          <Link
            href="/planner"
            className={`${navLinkBase} ${
              active === "planner" ? navLinkActive : navLinkInactive
            }`}
          >
            Planner
          </Link>

          {/* Apps button (desktop) */}
          <button
            type="button"
            onClick={() => setAppsOpen((v) => !v)}
            className={`${navLinkBase} ml-2 flex items-center gap-1 border border-slate-700 bg-slate-900/40`}
          >
            <span className="flex items-center gap-1 text-[11px]">
              Apps
              {hasUnseenChangelog && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-indigo-600 text-white">
                  New
                </span>
              )}
            </span>
            <span className="text-[11px] opacity-80">
              {appsOpen ? "▲" : "▼"}
            </span>
          </button>
        </nav>

        {/* Right side: email + Settings + Logout / Login */}
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
            onClick={() => {
              setMobileOpen((v) => !v);
              setAppsOpen(false);
            }}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700 hover:bg-slate-900 text-slate-200 text-xs"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Apps Panel (desktop) */}
        {appsOpen && (
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/98 shadow-xl p-3 w-[360px]">
              <p className="text-[11px] text-slate-400 mb-2 px-1 flex items-center gap-1">
                Quick access to all tools
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-200">
                  beta
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/dashboard"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Dashboard
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Overview, usage & wins
                  </span>
                </Link>
                <Link
                  href="/notes"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Notes
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Capture ideas with AI
                  </span>
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Tasks
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Simple AI-assisted to-dos
                  </span>
                </Link>
                <Link
                  href="/planner"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Planner
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Plan your day with AI
                  </span>
                </Link>
                <Link
                  href="/templates"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Templates
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Reusable AI prompts
                  </span>
                </Link>
                <Link
                  href="/daily-success"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Daily Success
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Rate your day (score)
                  </span>
                </Link>
                <Link
                  href="/weekly-reports"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Weekly Reports
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Email & history
                  </span>
                </Link>
                <Link
                  href="/feedback"
                  onClick={() => setAppsOpen(false)}
                  className={appsItemBase}
                >
                  <span className="font-semibold text-slate-100">
                    Feedback
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Help improve the app
                  </span>
                </Link>

                {/* Changelog / What's new */}
                <Link
                  href="/changelog"
                  onClick={() => setAppsOpen(false)}
                  className={`${appsItemBase} ${
                    hasUnseenChangelog ? "border-indigo-500/70" : ""
                  }`}
                >
                  <span className="flex items-center gap-1 font-semibold text-slate-100">
                    What&apos;s new
                    {hasUnseenChangelog && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full bg-indigo-600/40 text-indigo-50">
                        New
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    See latest updates & changes
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile dropdown menu */}
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
                  active === "daily-success"
                    ? navLinkActive
                    : navLinkInactive
                }`}
              >
                Daily Success
              </Link>
              <Link
                href="/weekly-reports"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "weekly-reports"
                    ? navLinkActive
                    : navLinkInactive
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
              <Link
                href="/changelog"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "changelog" ? navLinkActive : navLinkInactive
                }`}
              >
                What&apos;s new
                {hasUnseenChangelog && (
                  <span className="ml-1 text-[10px] px-1 py-0.5 rounded-full bg-indigo-600 text-white">
                    New
                  </span>
                )}
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className={`${navLinkBase} ${
                  active === "settings" ? navLinkActive : navLinkInactive
                }`}
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
