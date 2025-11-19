"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

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
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
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
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
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

  // ---- Main admin dashboard ----
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Admin dashboard
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Internal tools for managing users and monitoring the app.
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              Logged in as <span className="font-mono">{user.email}</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Users management */}
            <Link
              href="/admin/users"
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:bg-slate-900/90 transition-colors flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">
                  USERS
                </p>
                <h2 className="text-base font-semibold text-slate-50 mb-1">
                  Users & plans
                </h2>
                <p className="text-[12px] text-slate-400">
                  View profiles, plans, admin flag and send password reset emails.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-indigo-300">
                Open users table →
              </p>
            </Link>

            {/* Placeholder for future tools */}
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">
                  COMING SOON
                </p>
                <h2 className="text-base font-semibold text-slate-50 mb-1">
                  More admin tools
                </h2>
                <p className="text-[12px] text-slate-400">
                  You can add usage overview, AI cost stats, or feature flags here
                  later.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                For now, use the Users section.
              </p>
            </div>
          </div>

          <div className="mt-8 text-[11px] text-slate-500">
            <p>
              Tip: set <code>NEXT_PUBLIC_ADMIN_EMAIL</code> in your env to control
              who can see this section.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
