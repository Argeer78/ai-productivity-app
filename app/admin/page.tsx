// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Reusable panel component for sending test emails
function AdminEmailTestPanel({
  currentUserEmail,
}: {
  currentUserEmail: string | null;
}) {
  const [targetEmail, setTargetEmail] = useState(currentUserEmail || "");
  const [kind, setKind] = useState<"simple" | "daily" | "weekly">("simple");
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
            className="w-full rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-main)] mb-1">
            Email type
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-2 text-sm text-[var(--text-main)]"
          >
            <option value="simple">Simple test</option>
            <option value="daily">Daily digest style</option>
            <option value="weekly">Weekly report style</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-xs font-medium text-[var(--bg-body)] disabled:opacity-60"
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

  // ---- Auth guards ----
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
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--bg-body)]"
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
            className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // ---- Main admin dashboard ----
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
                Internal tools for managing users and monitoring the app.
              </p>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Logged in as{" "}
              <span className="font-mono">{user.email}</span>
            </span>
          </div>

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

            {/* Changelog editor card */}
            <Link
              href="/changelog/admin"
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-elevated)] transition-colors flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  CHANGELOG
                </p>
                <h2 className="text-base font-semibold mb-1">
                  Changelog editor
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Add and organize entries that appear on the public
                  “What&apos;s new” page.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-[var(--accent)]">
                Open changelog admin →
              </p>
            </Link>

            {/* Placeholder for future tools */}
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  COMING SOON
                </p>
                <h2 className="text-base font-semibold mb-1">
                  More admin tools
                </h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                  You can add usage overview, AI cost stats, or feature flags
                  here later.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                For now, use the Users and Changelog sections.
              </p>
            </div>
          </div>

          {/* Email test panel (only admin can see this page anyway) */}
          <AdminEmailTestPanel currentUserEmail={user.email ?? null} />

          <div className="mt-8 text-[11px] text-[var(--text-muted)]">
            <p>
              Tip: set <code>NEXT_PUBLIC_ADMIN_EMAIL</code> and{" "}
              <code>NEXT_PUBLIC_ADMIN_KEY</code> in your env to control who can
              access admin tools and send test emails.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
