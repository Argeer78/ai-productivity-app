// app/admin/users/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type ProfileRow = {
  id: string;
  email: string | null;
  plan: string | null;
  created_at: string;
};

type UserStats = {
  notesCount: number;
  tasksCount: number;
  tripsCount: number;
  totalAiCalls: number;
  lastAiDate: string | null;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  profile?: ProfileRow;
  stats?: UserStats;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const [me, setMe] = useState<any | null>(null);
  const [checkingMe, setCheckingMe] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load current admin
  useEffect(() => {
    async function loadMe() {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;
        setMe(u);
        if (u?.email && ADMIN_EMAIL && u.email === ADMIN_EMAIL) {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("[admin/user] loadMe error", err);
      } finally {
        setCheckingMe(false);
      }
    }
    loadMe();
  }, []);

  // Load profile + stats via admin API
  useEffect(() => {
    if (!authorized || !userId) return;
    if (!ADMIN_KEY) {
      setError(
        "Admin key (NEXT_PUBLIC_ADMIN_KEY) is not configured. Cannot load user data."
      );
      return;
    }

    async function loadUserData() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          headers: {
            "x-admin-key": ADMIN_KEY,
          },
        });

        const json: ApiResponse = await res.json().catch(() => ({
          ok: false,
          error: "Invalid server response.",
        }));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load user data.");
        }

        setProfile(json.profile ?? null);
        setStats(json.stats ?? null);
      } catch (err: any) {
        console.error("[admin/user] loadUserData error", err);
        setError(err?.message || "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [authorized, userId]);

  // Guards
  if (checkingMe) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Checking your session…
        </p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm">
          <h1 className="text-2xl font-bold mb-3">Admin – User</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm">
            You need to log in as admin to view user profiles.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)]"
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
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm">
          <h1 className="text-2xl font-bold mb-3">Admin – User</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm">
            This page is restricted. Your account is not marked as admin.
          </p>
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"
          >
            Back to Users
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                User profile
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Inspect a single user’s activity and usage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                href="/admin/users"
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                ← Back to Users
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                Admin overview
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {loading || !profile || !stats ? (
            <p className="text-[var(--text-muted)] text-sm">
              Loading user data…
            </p>
          ) : (
            <>
              {/* Profile card */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 mb-6">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                  PROFILE
                </p>
                <div className="space-y-1 text-[13px]">
                  <p>
                    <span className="text-[var(--text-muted)]">User ID: </span>
                    <span className="font-mono break-all">
                      {profile.id}
                    </span>
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Email: </span>
                    <span>
                      {profile.email || "(no email in profile)"}
                    </span>
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Plan: </span>
                    <span>{profile.plan || "free"}</span>
                  </p>
                  <p>
                    <span className="text-[var(--text-muted)]">Created: </span>
                    <span>
                      {new Date(profile.created_at).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Usage stats */}
              <div className="grid md:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    NOTES
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.notesCount}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Total notes.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    TASKS
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.tasksCount}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Total tasks.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    TRIPS
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.tripsCount}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Saved travel plans.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    AI CALLS (LAST 30D)
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.totalAiCalls}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Last AI usage:{" "}
                    {stats.lastAiDate
                      ? new Date(
                          stats.lastAiDate
                        ).toLocaleDateString()
                      : "no usage yet"}
                  </p>
                </div>
              </div>

              {/* Danger zone placeholder */}
              <div className="rounded-2xl border border-red-800/70 bg-red-950/20 p-4 text-sm">
                <p className="text-xs font-semibold text-red-200 mb-2">
                  DANGER ZONE (not wired yet)
                </p>
                <p className="text-[11px] text-red-100/80 mb-3">
                  When you&apos;re ready, we can hook these buttons to
                  secure server-side API routes using the Supabase service
                  role:
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-xl border border-red-500/60 text-red-200/70 cursor-not-allowed"
                  >
                    Reset AI quota (TODO)
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-xl border border-red-500/60 text-red-200/70 cursor-not-allowed"
                  >
                    Force set plan (TODO)
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-xl border border-red-500/60 text-red-200/70 cursor-not-allowed"
                  >
                    Delete user & data (TODO)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
