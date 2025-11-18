"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/app/components/LanguageProvider";
import TranslateWithAIButton from "@/app/components/TranslateWithAIButton";
import { SUPPORTED_LANGS, translate, type TranslationKey } from "@/lib/i18n";

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
    | "changelog"
    | "my-trips"
    | "travel";
};

const LATEST_CHANGELOG_AT = "2025-02-15T00:00:00Z";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AppHeader({ active }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const { lang, t, setLang } = useLanguage();
  const [latestSeenChangelogAt, setLatestSeenChangelogAt] =
    useState<string | null>(null);

  const isAdmin = !!userEmail && ADMIN_EMAIL && userEmail === ADMIN_EMAIL;

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!cancelled) {
          setUserEmail(user?.email ?? null);
          setUserId(user?.id ?? null);
        }

        if (user?.id && !cancelled) {
          const { data: profile, error: e2 } = await supabase
            .from("profiles")
            .select("latest_seen_changelog_at")
            .eq("id", user.id)
            .maybeSingle();

          if (!e2 && profile?.latest_seen_changelog_at) {
            setLatestSeenChangelogAt(profile.latest_seen_changelog_at);
          }
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

  const navLinkBase =
    "px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs sm:text-sm";
  const navLinkInactive = "text-slate-300 hover:bg-slate-900";
  const navLinkActive = "bg-slate-800 text-slate-50";

  const appsItemBase =
    "flex flex-col items-start justify-center px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 text-xs";

  const hasUnseenChangelog =
    !latestSeenChangelogAt ||
    new Date(latestSeenChangelogAt) < new Date(LATEST_CHANGELOG_AT);

  const appsActiveKeys: HeaderProps["active"][] = [
    "notes",
    "tasks",
    "planner",
    "templates",
    "daily-success",
    "weekly-reports",
    "feedback",
    "explore",
    "my-trips",
    "travel",
    "changelog",
    "admin",
  ];
  const isAppsActive = active && appsActiveKeys.includes(active);

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

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      {/* Top row (logo, nav, mobile menu) */}
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 relative">
        {/* Logo / brand */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            AI Productivity Hub
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1 min-w-0 overflow-x-auto">
          <Link
            href="/dashboard"
            className={`${navLinkBase} ${
              active === "dashboard" ? navLinkActive : navLinkInactive
            }`}
          >
            Dashboard
          </Link>

          {/* Apps – hub for Notes / Tasks / Planner / etc. */}
          <button
            type="button"
            onClick={() => setAppsOpen((v) => !v)}
            className={`${navLinkBase} ml-2 flex items-center gap-1 border border-slate-700 bg-slate-900/40 ${
              isAppsActive ? "bg-slate-800 text-slate-50" : ""
            }`}
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

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Mobile menu button – ONLY visible on mobile */}
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

          {/* Desktop-only user controls */}
          <div className="hidden md:flex items-center gap-2">
            {loadingUser ? (
              <span className="text-[11px] text-slate-400">Loading…</span>
            ) : userEmail ? (
              <span className="text-[11px] text-slate-300 truncate max-w-[140px]">
                {userEmail}
              </span>
            ) : null}

            <TranslateWithAIButton />

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
                {loggingOut ? "…" : "Log out"}
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
        </div>

        {/* Apps Panel (desktop) */}
        {appsOpen && (
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/98 shadow-xl p-3 w-[380px]">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link href="/dashboard" className={appsItemBase}>
                  Dashboard
                </Link>
                <Link href="/notes" className={appsItemBase}>
                  Notes
                </Link>
                <Link href="/tasks" className={appsItemBase}>
                  Tasks
                </Link>
                <Link href="/planner" className={appsItemBase}>
                  Planner
                </Link>
                <Link href="/templates" className={appsItemBase}>
                  Templates
                </Link>
                <Link href="/daily-success" className={appsItemBase}>
                  Daily Success
                </Link>
                <Link href="/weekly-reports" className={appsItemBase}>
                  Weekly Reports
                </Link>
                <Link href="/my-trips" className={appsItemBase}>
                  My Trips
                </Link>
                <Link href="/travel" className={appsItemBase}>
                  Travel Planner
                </Link>
                <Link href="/feedback" className={appsItemBase}>
                  Feedback
                </Link>
                <Link href="/changelog" className={appsItemBase}>
                  What’s new
                </Link>

                {isAdmin && (
                  <Link href="/admin" className={appsItemBase}>
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 👇 Mobile-only secondary header row: email + translate + settings + auth */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950/95">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {loadingUser ? (
            <span className="text-[11px] text-slate-400">Loading…</span>
          ) : userEmail ? (
            <span className="text-[11px] text-slate-300 truncate max-w-[140px]">
              {userEmail}
            </span>
          ) : null}

          <TranslateWithAIButton />

          <Link
            href="/settings"
            className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200 flex-shrink-0"
          >
            Settings
          </Link>

          {userEmail ? (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200 disabled:opacity-60 flex-shrink-0"
            >
              {loggingOut ? "…" : "Log out"}
            </button>
          ) : (
            <Link
              href="/auth"
              className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200 flex-shrink-0"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu (nav links) */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95">
          <div className="px-4 py-3 flex flex-col gap-2 text-sm">
            <Link href="/dashboard" className={navLinkBase}>
              Dashboard
            </Link>
            <Link href="/notes" className={navLinkBase}>
              Notes
            </Link>
            <Link href="/tasks" className={navLinkBase}>
              Tasks
            </Link>
            <Link href="/planner" className={navLinkBase}>
              Planner
            </Link>
            <Link href="/templates" className={navLinkBase}>
              Templates
            </Link>
            <Link href="/daily-success" className={navLinkBase}>
              Daily Success
            </Link>
            <Link href="/weekly-reports" className={navLinkBase}>
              Weekly Reports
            </Link>
            <Link href="/travel" className={navLinkBase}>
              Travel Planner
            </Link>
            <Link href="/my-trips" className={navLinkBase}>
              My Trips
            </Link>
            <Link href="/feedback" className={navLinkBase}>
              Feedback
            </Link>
            <Link href="/changelog" className={navLinkBase}>
              What’s new
            </Link>
            <Link href="/settings" className={navLinkBase}>
              Settings
            </Link>

            {isAdmin && (
              <Link href="/admin" className={navLinkBase}>
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
