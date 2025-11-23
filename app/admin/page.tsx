"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

/* -------------------------------------------------------------------------- */
/*                         COMPONENT: Email Test Panel                        */
/* -------------------------------------------------------------------------- */

function AdminEmailTestPanel() {
  const [targetEmail, setTargetEmail] = useState("");
  const [kind, setKind] = useState<"simple" | "daily" | "weekly">("simple");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!targetEmail.trim()) {
      setStatus("Please enter a destination email.");
      return;
    }

    setSending(true);
    setStatus(null);

    try {
     const res = await fetch("/api/admin-test-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
  },
  body: JSON.stringify({ targetEmail, kind }),
});

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to send test email");
      }

      setStatus("✅ Test email sent! Check inbox/spam of that address.");
    } catch (err: any) {
      setStatus(`❌ ${err?.message || "Error sending email"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <h2 className="text-sm font-semibold mb-2 text-slate-100">
        Email deliverability tester
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Send a test email via Resend to any address (e.g., Mail-Tester).
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="block text-[11px] text-slate-300 mb-1">
            Destination email
          </label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="test@mail-tester.com"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-300 mb-1">
            Email type
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-sm text-slate-100"
          >
            <option value="simple">Simple test</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly report</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send test email"}
        </button>
      </div>

      {status && (
        <p className="mt-3 text-[11px] text-slate-300 whitespace-pre-line">
          {status}
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN ADMIN PAGE COMPONENT                        */
/* -------------------------------------------------------------------------- */

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

        if (u?.email && u.email === ADMIN_EMAIL) {
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

  /* ------------------------------ AUTH GUARDS ------------------------------ */

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin</h1>
          <p className="text-slate-300 mb-4 text-center text-sm">
            You need to log in to access the admin area.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin</h1>
          <p className="text-slate-300 mb-4 text-center text-sm">
            This page is restricted. Your account is not marked as admin.
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  /* ------------------------------ MAIN CONTENT ----------------------------- */

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="admin" />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 text-sm">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Admin dashboard
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Internal tools for managing users & monitoring the app.
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              Logged in as <span className="font-mono">{user.email}</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/admin/users"
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:bg-slate-900/90"
            >
              <p className="text-[11px] font-semibold text-slate-400 mb-1">
                USERS
              </p>
              <h2 className="text-base font-semibold text-slate-50 mb-1">
                Users & plans
              </h2>
              <p className="text-[12px] text-slate-400">
                View profiles, plan status, admin flag, and send resets.
              </p>
            </Link>

            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
              <p className="text-[11px] font-semibold text-slate-400 mb-1">
                COMING SOON
              </p>
              <h2 className="text-base font-semibold text-slate-50 mb-1">
                More admin tools
              </h2>
              <p className="text-[12px] text-slate-400">
                Add usage dashboards, AI cost charts, feature flags, etc.
              </p>
            </div>
          </div>

          {/* Insert the email tester */}
          <AdminEmailTestPanel />

          <div className="mt-8 text-[11px] text-slate-500">
            Tip: set <code>NEXT_PUBLIC_ADMIN_EMAIL</code> in your env.
          </div>

        </div>
      </div>
    </main>
  );
}
