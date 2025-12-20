"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TranslateWithAIButton from "@/app/components/TranslateWithAIButton";
import InstallAppButton from "@/app/components/InstallAppButton";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useUiStrings } from "@/app/components/UiStringsProvider";
import {
  StickyNote,
  CheckSquare,
  Calendar,
  MessageSquare,
  HeartHandshake,
  FileText,
  Sun,
  BarChart3,
  Plane,
  Map,
  Sparkles,
  Shield,
} from "lucide-react";

type HeaderProps = {
  active?:
    | "dashboard"
    | "pricing"
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
    | "ai-companion"
    | "ai-chat";
};

const APPS: {
  href: string;
  navKey: string;
  fallback: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { href: "/notes", navKey: "notes", fallback: "Notes", Icon: StickyNote },
  { href: "/tasks", navKey: "tasks", fallback: "Tasks", Icon: CheckSquare },
  { href: "/planner", navKey: "planner", fallback: "Planner", Icon: Calendar },
  { href: "/ai-chat", navKey: "aiChat", fallback: "AI Hub Chat", Icon: MessageSquare },
  { href: "/ai-companion", navKey: "aiCompanion", fallback: "AI Companion", Icon: HeartHandshake },
  { href: "/templates", navKey: "templates", fallback: "Templates", Icon: FileText },
  { href: "/daily-success", navKey: "dailySuccess", fallback: "Daily Success", Icon: Sun },
  { href: "/weekly-reports", navKey: "weeklyReports", fallback: "Weekly Reports", Icon: BarChart3 },
  { href: "/travel", navKey: "travel", fallback: "Travel", Icon: Plane },
  { href: "/my-trips", navKey: "myTrips", fallback: "My Trips", Icon: Map },
  { href: "/changelog", navKey: "changelog", fallback: "What’s new", Icon: Sparkles },
];

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AppHeader({ active }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const appsWrapRef = useRef<HTMLDivElement | null>(null);
  const appsButtonRef = useRef<HTMLButtonElement | null>(null);

  const { lang, label: currentLangLabel } = useLanguage();
  const ui = useUiStrings();

  const t = useMemo(() => {
    if (typeof (ui as any)?.t === "function") {
      return (key: string, fallback?: string) => (ui as any).t(key, fallback);
    }
    const dict = (ui as any)?.dict as Record<string, string> | undefined;
    return (key: string, fallback?: string) => dict?.[key] ?? fallback ?? key;
  }, [ui, lang]);

  const navLabel = (key: string, fallback: string) => t(`nav.${key}`, fallback);
  const authLabel = (key: "login" | "logout", fallback: string) => t(`auth.${key}`, fallback);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setAppsOpen(false);
  }, [pathname]);

  // Load user
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUserEmail(data?.user?.email ?? null);
      } catch (e) {
        console.error("[AppHeader] loadUser error", e);
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

  // Desktop outside-click + ESC close for Apps dropdown
  useEffect(() => {
    if (!appsOpen) return;

    function isDesktop() {
      return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    }

    function onPointerDown(e: PointerEvent) {
      if (!isDesktop()) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (appsWrapRef.current?.contains(target)) return;
      setAppsOpen(false);
      appsButtonRef.current?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!isDesktop()) return;
      if (e.key === "Escape") {
        setAppsOpen(false);
        appsButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [appsOpen]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/");
    } catch (e) {
      console.error("[AppHeader] logout error", e);
    } finally {
      setLoggingOut(false);
    }
  }

  const navLinkBase = "px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs sm:text-sm";
  const navLinkInactive = "text-[var(--text-muted)] hover:bg-[var(--accent-soft)]";
  const navLinkActive = "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold";

  const appsItemBase =
    "flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] text-xs text-[var(--text-main)]";

  const appsActive = [
    "pricing",
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
    "ai-companion",
    "ai-chat",
  ].includes(active || "");

  const mobileRoutes: {
    key: HeaderProps["active"];
    label: string;
    href: string;
    adminOnly?: boolean;
  }[] = [
    { key: "dashboard", label: navLabel("dashboard", "Dashboard"), href: "/dashboard" },
    { key: "pricing", label: navLabel("pricing", "Pricing"), href: "/pricing" },
    { key: "notes", label: navLabel("notes", "Notes"), href: "/notes" },
    { key: "tasks", label: navLabel("tasks", "Tasks"), href: "/tasks" },
    { key: "planner", label: navLabel("planner", "Planner"), href: "/planner" },
    { key: "ai-chat", label: navLabel("aiChat", "AI Hub Chat"), href: "/ai-chat" },
    { key: "ai-companion", label: navLabel("aiCompanion", "AI Companion"), href: "/ai-companion" },
    { key: "templates", label: navLabel("templates", "Templates"), href: "/templates" },
    { key: "daily-success", label: navLabel("dailySuccess", "Daily Success"), href: "/daily-success" },
    { key: "weekly-reports", label: navLabel("weeklyReports", "Weekly Reports"), href: "/weekly-reports" },
    { key: "travel", label: navLabel("travel", "Travel Planner"), href: "/travel" },
    { key: "my-trips", label: navLabel("myTrips", "My Trips"), href: "/my-trips" },
    { key: "changelog", label: navLabel("changelog", "What’s new"), href: "/changelog" },
    { key: "settings", label: navLabel("settings", "Settings"), href: "/settings" },
    { key: "admin", label: navLabel("admin", "Admin"), href: "/admin", adminOnly: true },
  ];

  return (
    <header className="relative z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 relative">
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
            AI Productivity Hub
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
          <Link
            href="/dashboard"
            className={`${navLinkBase} ${active === "dashboard" ? navLinkActive : navLinkInactive}`}
          >
            {navLabel("dashboard", "Dashboard")}
          </Link>

          <Link
            href="/pricing"
            className={`${navLinkBase} ${active === "pricing" ? navLinkActive : navLinkInactive}`}
          >
            {navLabel("pricing", "Pricing")}
          </Link>

          {/* Apps dropdown (wrapped) */}
          <div ref={appsWrapRef} className="relative">
            <button
              ref={appsButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={appsOpen}
              onClick={() => setAppsOpen((v) => !v)}
              className={`${navLinkBase} ml-2 flex items-center gap-1 border border-[var(--border-subtle)] bg-[var(--bg-card)] ${
                appsActive ? "text-[var(--accent)] bg-[var(--accent-soft)]" : ""
              }`}
            >
              {navLabel("apps", "Apps")}
              <span className="text-[11px] opacity-80">{appsOpen ? "▲" : "▼"}</span>
            </button>

            {appsOpen && (
              <div role="menu" className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[80]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 shadow-xl p-3 w-[380px]">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {APPS.map(({ href, navKey, fallback, Icon }) => (
                      <Link key={href} href={href} className={appsItemBase}>
                        <Icon size={16} className="text-[var(--accent)] shrink-0" />
                        <span className="font-medium">{navLabel(navKey, fallback)}</span>
                      </Link>
                    ))}

                    {isAdmin && (
                      <Link href="/admin" className={appsItemBase}>
                        <Shield size={16} className="text-red-400 shrink-0" />
                        <span className="font-medium">{navLabel("admin", "Admin")}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile button */}
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

        <div className="md:hidden text-[10px] text-[var(--text-muted)] truncate max-w-[90px]">
          {!loadingUser && userEmail}
        </div>

        {/* Desktop right side */}
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
      </div>

      {/* Mobile top row */}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95">
          <div className="px-4 py-3 flex flex-col gap-2 text-sm text-[var(--text-main)]">
            {mobileRoutes.map((route) => {
              if (route.adminOnly && !isAdmin) return null;
              const isActive = active === route.key;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`}
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
