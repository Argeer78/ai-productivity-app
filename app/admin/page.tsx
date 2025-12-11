// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type AdminStats = {
  totalUsers: number;
  proUsers: number;
  weeklyActiveUsers: number;
  aiCalls7d: number;
  notesCount: number;
  tasksCount: number;
};

function AdminEmailTestPanel({
  currentUserEmail,
}: {
  currentUserEmail: string | null;
}) {
  const [targetEmail, setTargetEmail] = useState(currentUserEmail || "");
  const [kind, setKind] = useState<
    "simple" | "daily" | "weekly" | "upgrade-pro" | "upgrade-founder"
  >("simple");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!targetEmail.trim()) {
      setStatus("Please enter a destination email.");
      return;
    }

    if (!ADMIN_KEY) {
      setStatus("Admin key (NEXT_PUBLIC_ADMIN_KEY) is not configured.");
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": ADMIN_KEY,
        },
        body: JSON.stringify({
          targetEmail: targetEmail.trim(),
          kind,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to send test email");
      }

      setStatus("✅ Test email sent! Check the inbox/spam for that address.");
    } catch (err: any) {
      console.error("[AdminEmailTestPanel] send error", err);
      setStatus(`❌ ${err?.message || "Error sending email"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <h2 className="text-sm font-semibold mb-2 text-[var(--text-main)]">
        Email deliverability tester
      </h2>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        Send a test email via Resend to any address (e.g. Mail-Tester). Only
        visible on the admin page.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="block text-[11px] text-[var(--text-main)] mb-1">
            Destination email
          </label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="e.g. your-mail-tester-address@mail-tester.com"
            className="w-full rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-main)] mb-1">
            Email type
          </label>
          <select
            value={kind}
            onChange={(e) =>
              setKind(
                e.target.value as
                  | "simple"
                  | "daily"
                  | "weekly"
                  | "upgrade-pro"
                  | "upgrade-founder"
              )
            }
            className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-2 text-sm"
          >
            <option value="simple">Simple test</option>
            <option value="daily">Daily digest style</option>
            <option value="weekly">Weekly report style</option>
            <option value="upgrade-pro">Stripe thank-you (Pro)</option>
            <option value="upgrade-founder">Stripe thank-you (Founder)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-xs font-medium disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send test email"}
        </button>
      </div>

      {status && (
        <p className="mt-2 text-[11px] text-[var(--text-main)] whitespace-pre-line">
          {status}
        </p>
      )}

      {!ADMIN_KEY && (
        <p className="mt-2 text-[11px] text-amber-400">
          Warning: <code>NEXT_PUBLIC_ADMIN_KEY</code> is not set in your env.
        </p>
      )}
    </section>
  );
}

export default function AdminHomePage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 🔹 UI translations sync state
  const [syncLang, setSyncLang] = useState<string>("el");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;
        setUser(u);

        if (u?.email && ADMIN_EMAIL && u.email === ADMIN_EMAIL) {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("[admin] loadUser error", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!authorized || !ADMIN_KEY) return;

    async function loadStats() {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const res = await fetch("/admin/api/stats", {
          headers: {
            "X-Admin-Key": ADMIN_KEY,
          },
        });
        const json = await res.json().catch(() => null as any);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load stats");
        }

        setStats(json.stats as AdminStats);
      } catch (err: any) {
        console.error("[admin] loadStats error", err);
        setStatsError(err?.message || "Failed to load stats");
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [authorized]);

  // 🔹 Call /api/admin/ui-translation-sync (AI-based)
  async function handleSyncUiTranslations() {
    if (!ADMIN_KEY) {
      setSyncStatus("Admin key (NEXT_PUBLIC_ADMIN_KEY) is not configured.");
      return;
    }

    setSyncLoading(true);
    setSyncStatus(null);

    try {
      const res = await fetch("/api/admin/ui-translation-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": ADMIN_KEY,
        },
        body: JSON.stringify({
          languageCode: syncLang,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to sync UI translations");
      }

      const count = data.insertedOrUpdated ?? 0;
      setSyncStatus(
        `✅ Synced ${count} UI strings for language '${syncLang}'.`
      );
    } catch (err: any) {
      console.error("[admin] sync UI translations error:", err);
      setSyncStatus(
        `❌ ${err?.message || "Unexpected error while syncing translations."}`
      );
    } finally {
      setSyncLoading(false);
    }
  }

  // Auth guards
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Checking your session…
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            You need to log in to access the admin area.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            This page is restricted. Your account is not marked as admin.
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Admin dashboard
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Internal tools for managing users, monitoring the app and
                testing emails.
              </p>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Logged in as{" "}
              <span className="font-mono">{user.email}</span>
            </span>
          </div>

          {/* Stats grid */}
          <section className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                  OVERVIEW
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  High-level metrics from Supabase.
                </p>
              </div>
              {statsLoading && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Loading…
                </span>
              )}
            </div>

            {statsError && (
              <p className="text-[11px] text-red-400 mb-2">
                {statsError}
              </p>
            )}

            {stats && (
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    Total users
                  </p>
                  <p className="text-xl font-semibold">
                    {stats.totalUsers}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Pro: {stats.proUsers}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    Active (last 7 days)
                  </p>
                  <p className="text-xl font-semibold">
                    {stats.weeklyActiveUsers}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    users with AI usage
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    AI calls (last 7 days)
                  </p>
                  <p className="text-xl font-semibold">
                    {stats.aiCalls7d}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    across all users
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    Notes
                  </p>
                  <p className="text-xl font-semibold">
                    {stats.notesCount}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    total notes in DB
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    Tasks
                  </p>
                  <p className="text-xl font-semibold">
                    {stats.tasksCount}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    total tasks in DB
                  </p>
                </div>
              </div>
            )}

            {!stats && !statsLoading && !statsError && (
              <p className="text-[11px] text-[var(--text-muted)]">
                No stats available yet.
              </p>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Users management */}
            <Link
              href="/admin/users"
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-elevated)] transition-colors flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  USERS
                </p>
                <h2 className="text-base font-semibold mb-1">
                  Users & plans
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  View profiles, plans, admin flag and send password reset
                  emails.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-[var(--accent)]">
                Open users table →
              </p>
            </Link>

            {/* Changelog admin card */}
            <Link
              href="/changelog/admin"
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-elevated)] transition-colors flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  CHANGELOG
                </p>
                <h2 className="text-base font-semibold mb-1">
                  Manage “What&apos;s new”
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Publish new entries to the public changelog page without
                  redeploying.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-[var(--accent)]">
                Open changelog admin →
              </p>
            </Link>
          </div>

          {/* UI translations sync panel */}
          <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <h2 className="text-sm font-semibold mb-1 text-[var(--text-main)]">
              UI translations (AI sync)
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mb-3">
              Use AI to translate all English UI strings into another language
              and upsert them into the{" "}
              <code>ui_translations</code> table.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div>
                <label className="block text-[11px] text-[var(--text-main)] mb-1">
                  Target language
                </label>
                <select
                  value={syncLang}
                  onChange={(e) => setSyncLang(e.target.value)}
                  className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs"
                >
                  <option value="el">Greek (el)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="de">German (de)</option>
                  <option value="fr">French (fr)</option>
                  <option value="it">Italian (it)</option>
                  <option value="pt">Portuguese (pt)</option>
                  <option value="tr">Turkish (tr)</option>
                  <option value="ru">Russian (ru)</option>
                  <option value="ro">Romanian (ro)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSyncUiTranslations}
                disabled={syncLoading}
                className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-xs font-medium disabled:opacity-60"
              >
                {syncLoading ? "Syncing…" : "Sync UI translations"}
              </button>
            </div>

            {syncStatus && (
              <p className="mt-2 text-[11px] text-[var(--text-main)] whitespace-pre-line">
                {syncStatus}
              </p>
            )}
          </section>

          <AdminEmailTestPanel currentUserEmail={user.email ?? null} />

          <div className="mt-8 text-[11px] text-[var(--text-muted)]">
            <p>
              Tip: set <code>NEXT_PUBLIC_ADMIN_EMAIL</code>,{" "}
              <code>NEXT_PUBLIC_ADMIN_KEY</code> and <code>ADMIN_KEY</code> in
              your env to control who can access admin tools and protected APIs.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
