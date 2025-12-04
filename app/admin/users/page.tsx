// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type AdminUserRow = {
  id: string;
  email: string | null;
  plan: string | null;
  created_at: string;
};

type UsersApiResponse = {
  ok: boolean;
  error?: string;
  users?: AdminUserRow[];
  total?: number;
};

export default function AdminUsersPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");

  // Load current user and check admin email
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
        console.error("[admin/users] loadUser error", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Fetch users (with search + filters)
  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (planFilter) params.set("plan", planFilter);

        const res = await fetch(`/admin/api/users?${params.toString()}`, {
          headers: {
            "X-Admin-Key": ADMIN_KEY,
          },
          signal: controller.signal,
        });

        const json = (await res.json().catch(() => ({}))) as UsersApiResponse;

        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load users");
        }

        setUsers(json.users || []);
        setTotal(typeof json.total === "number" ? json.total : null);
      } catch (err: any) {
        if (cancelled || err?.name === "AbortError") return;
        console.error("[admin/users] loadUsers error", err);
        setError(err?.message || "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // small debounce for search
    const timeout = setTimeout(loadUsers, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [authorized, search, planFilter]);

  // ---- Guards ----
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin – Users</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            You need to log in to access the users list.
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
          <h1 className="text-2xl font-bold mb-3">Admin – Users</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            This page is restricted. Your account is not marked as admin.
          </p>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
          >
            Back to Admin
          </Link>
        </div>
      </main>
    );
  }

  // ---- Main UI ----
  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Users</h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Search and inspect user profiles. You can click through to see detailed stats.
              </p>
            </div>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to Admin
            </Link>
          </div>

          {/* Filters / search row */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center mb-4">
            <div className="flex-1 w-full">
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                Search by email or user ID
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. user@example.com or UUID"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                Plan
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as any)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
              >
                <option value="all">All plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          <div className="mb-3 text-[11px] text-[var(--text-muted)]">
            {loading
              ? "Loading users…"
              : `Showing ${users.length} user${
                  users.length === 1 ? "" : "s"
                }${total !== null ? ` (total: ${total})` : ""}.`}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <table className="min-w-full text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Plan</th>
                  <th className="text-left px-3 py-2 font-medium">Created</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[var(--text-muted)]"
                    >
                      No users found for this search / filter.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[13px]">
                          {u.email || "(no email)"}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] break-all">
                          {u.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[13px]">
                      {u.plan || "free"}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-body)] text-[11px]"
                      >
                        View details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            Search is currently matching <code>email</code> (ILIKE) and exact{" "}
            <code>id</code>. We can extend it later to include more fields.
          </p>
        </div>
      </div>
    </main>
  );
}
