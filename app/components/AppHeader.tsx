"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TranslateWithAIButton from "@/app/components/TranslateWithAIButton";
import { useLanguage } from "@/app/components/LanguageProvider";
import InstallAppButton from "@/app/components/InstallAppButton";
import Image from "next/image";
import { useUiI18n } from "@/lib/useUiI18n";

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
    | "travel"
    | "ai-chat";
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AppHeader({ active }: HeaderProps) {
  const router = useRouter();

  const languageCtx = useLanguage() as any;

  // Try to infer the language code from your LanguageProvider
  const uiLangCode: string =
    languageCtx?.lang ||
    languageCtx?.code ||
    languageCtx?.languageCode ||
    languageCtx?.language ||
    "en";

  const currentLangLabel: string | null =
    languageCtx?.label || languageCtx?.languageLabel || null;

  // Load UI translations for the current language
  const { t } = useUiI18n(uiLangCode);

  // --- small helpers so "nav." / "auth." keys never leak into the UI ---

  function navLabel(key: string, fallback: string) {
    const fullKey = `nav.${key}`;
    const val = t(fullKey);
    // If the translation is missing or equal to the key itself, use fallback
    if (!val || val === fullKey) return fallback;
    return val;
  }

  function authLabel(key: "login" | "logout", fallback: string) {
    const fullKey = `auth.${key}`;
    const val = t(fullKey);
    if (!val || val === fullKey) return fallback;
    return val;
  }

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!cancelled) setUserEmail(user?.email ?? null);
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

  const isAdmin = userEmail === ADMIN_EMAIL;

  // Theme-aware nav classes
  const navLinkBase =
    "px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs sm:text-sm";
  const navLinkInactive =
    "text-[var(--text-muted)] hover:bg-[var(--accent-soft)]";
  const navLinkActive =
    "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold";

  const appsItemBase =
    "flex flex-col items-start justify-center px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-xs text-[var(--text-main)]";

  const appsActive = [
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
    "ai-chat",
  ].includes(active || "");

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

  // Mobile routes with translated labels + admin gating
  const mobileRoutes: {
    key: HeaderProps["active"];
    label: string;
    href: string;
    adminOnly?: boolean;
  }[] = [
    {
      key: "dashboard",
      label: navLabel("dashboard", "Dashboard"),
      href: "/dashboard",
    },
    { key: "notes", label: navLabel("notes", "Notes"), href: "/notes" },
    { key: "tasks", label: navLabel("tasks", "Tasks"), href: "/tasks" },
    {
      key: "planner",
      label: navLabel("planner", "Planner"),
      href: "/planner",
    },
    {
      key: "ai-chat",
      label: navLabel("aiChat", "AI Hub Chat"),
      href: "/ai-chat",
    },
    {
      key: "templates",
      label: navLabel("templates", "Templates"),
      href: "/templates",
    },
    {
      key: "daily-success",
      label: navLabel("dailySuccess", "Daily Success"),
      href: "/daily-success",
    },
    {
      key: "weekly-reports",
      label: navLabel("weeklyReports", "Weekly Reports"),
      href: "/weekly-reports",
    },
    {
      key: "travel",
      label: navLabel("travel", "Travel Planner"),
      href: "/travel",
    },
    {
      key: "my-trips",
      label: navLabel("myTrips", "My Trips"),
      href: "/my-trips",
    },
    {
      key: "feedback",
      label: navLabel("feedback", "Feedback"),
      href: "/feedback",
      adminOnly: true,
    },
    {
      key: "changelog",
      label: navLabel("changelog", "What’s new"),
      href: "/changelog",
    },
    {
      key: "settings",
      label: navLabel("settings", "Settings"),
      href: "/settings",
    },
    {
      key: "admin",
      label: navLabel("admin", "Admin"),
      href: "/admin",
      adminOnly: true,
    },
  ];

  return (
    <header className="relative z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur">
      {/* === TOP BAR === */}
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/icon-512.png"
            alt="AI Productivity Hub logo"
            width={28}
            height={28}
            className="rounded-xl"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
            {/* App title stays English */}
            AI Productivity Hub
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
          <Link
            href="/dashboard"
            className={`${navLinkBase} ${
              active === "dashboard" ? navLinkActive : navLinkInactive
            }`}
          >
            {navLabel("dashboard", "Dashboard")}
          </Link>

          {/* Apps dropdown */}
          <button
            type="button"
            onClick={() => setAppsOpen((v) => !v)}
            className={`${navLinkBase} ml-2 flex items-center gap-1 border border-[var(--border-subtle)] bg-[var(--bg-card)] ${
              appsActive ? "text-[var(--accent)] bg-[var(--accent-soft)]" : ""
            }`}
          >
            {navLabel("apps", "Apps")}{" "}
            <span className="text-[11px] opacity-80">
              {appsOpen ? "▲" : "▼"}
            </span>
          </button>
        </nav>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen((v) => !v);
            setAppsOpen(false);
          }}
          className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[var(--text-main)] text-xs ml-auto"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {/* MOBILE EMAIL */}
        <div className="md:hidden text-[10px] text-[var(--text-muted)] truncate max-w-[90px]">
          {!loadingUser && userEmail}
        </div>

        {/* Desktop user actions */}
        <div className="hidden md:flex items-center gap-2 text-[var(--text-main)]">
          <TranslateWithAIButton />
          <InstallAppButton />

          {currentLangLabel && (
            <span className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
              {currentLangLabel}
            </span>
          )}

          <Link
            href="/settings"
            className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
          >
            {navLabel("settings", "Settings")}
          </Link>

          {userEmail ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
            >
              {loggingOut ? "…" : authLabel("logout", "Log out")}
            </button>
          ) : (
            <Link
              href="/auth"
              className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
            >
              {authLabel("login", "Log in")}
            </Link>
          )}
        </div>

        {/* Desktop Apps dropdown */}
        {appsOpen && (
          <div className="hidden md:block fixed left-1/2 -translate-x-1/2 top-14 mt-2 z-[80]">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 shadow-xl p-3 w-[380px]">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link href="/dashboard" className={appsItemBase}>
                  {navLabel("dashboard", "Dashboard")}
                </Link>
                <Link href="/notes" className={appsItemBase}>
                  {navLabel("notes", "Notes")}
                </Link>
                <Link href="/tasks" className={appsItemBase}>
                  {navLabel("tasks", "Tasks")}
                </Link>
                <Link href="/planner" className={appsItemBase}>
                  {navLabel("planner", "Planner")}
                </Link>
                <Link href="/ai-chat" className={appsItemBase}>
                  {navLabel("aiChat", "AI Hub Chat")}
                </Link>
                <Link href="/templates" className={appsItemBase}>
                  {navLabel("templates", "Templates")}
                </Link>
                <Link href="/daily-success" className={appsItemBase}>
                  {navLabel("dailySuccess", "Daily Success")}
                </Link>
                <Link href="/weekly-reports" className={appsItemBase}>
                  {navLabel("weeklyReports", "Weekly Reports")}
                </Link>
                <Link href="/my-trips" className={appsItemBase}>
                  {navLabel("myTrips", "My Trips")}
                </Link>
                <Link href="/travel" className={appsItemBase}>
                  {navLabel("travel", "Travel Planner")}
                </Link>

                {isAdmin && (
                  <Link href="/feedback" className={appsItemBase}>
                    {navLabel("feedback", "Feedback")}
                  </Link>
                )}

                <Link href="/changelog" className={appsItemBase}>
                  {navLabel("changelog", "What’s new")}
                </Link>

                {isAdmin && (
                  <Link href="/admin" className={appsItemBase}>
                    {navLabel("admin", "Admin")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === MOBILE SECOND ROW === */}
      <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <TranslateWithAIButton />
          <InstallAppButton />

          <Link
            href="/settings"
            className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
          >
            {navLabel("settings", "Settings")}
          </Link>

          {userEmail ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
            >
              {loggingOut ? "…" : authLabel("logout", "Log out")}
            </button>
          ) : (
            <Link
              href="/auth"
              className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--accent-soft)] text-[11px]"
            >
              {authLabel("login", "Log in")}
            </Link>
          )}
        </div>
      </div>

      {/* === MOBILE NAV === */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95">
          <div className="px-4 py-3 flex flex-col gap-2 text-sm text-[var(--text-main)]">
            {mobileRoutes.map((route) => {
              if (route.adminOnly && !isAdmin) return null;
              const isActive = active === route.key;
              return (
                <Link
                  key={route.key}
                  href={route.href}
                  className={`${navLinkBase} ${
                    isActive ? navLinkActive : navLinkInactive
                  }`}
                >
                  {route.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
