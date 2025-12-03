// app/admin/users/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type UserRow = {
  id: string;
  email: string | null;
  plan: string | null;
  created_at: string;
  is_admin: boolean | null;
};

export default function AdminUsersPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

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

  async function loadUsers(query?: string) {
    if (!ADMIN_KEY) {
      setError("NEXT_PUBLIC_ADMIN_KEY is not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/admin/users/api${params}`, {
        headers: {
          "X-Admin-Key": ADMIN_KEY,
        },
      });

      const json = await res.json().catch(() => null as any);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load users");
      }

      setUsers(json.users || []);
    } catch (err: any) {
      console.error("[admin/users] loadUsers error", err);
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authorized) {
      loadUsers();
    }
  }, [authorized]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    setSearching(!!q);
    loadUsers(q || undefined);
  }

  function handleClearSearch() {
    setSearch("");
    setSearching(false);
    loadUsers();
  }

  // Guards
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
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
          <h1 className="text-2xl font-bold mb-3">Admin · Users</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center max-w-sm">
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
          <h1 className="text-2xl font-bold mb-3">Admin · Users</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center max-w-sm">
            This page is restricted. Your account is not marked as admin.
          </p>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm"
          >
            Back to Admin
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
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Users
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Search, inspect and debug user profiles.
              </p>
            </div>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to Admin
            </Link>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mb-4 flex flex-wrap gap-2 items-center"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or user ID…"
              className="flex-1 min-w-[220px] rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs font-semibold"
            >
              {loading ? "Searching…" : "Search"}
            </button>
            {searching && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-xs"
              >
                Clear
              </button>
            )}
          </form>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Admin</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-[var(--text-muted)]"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-[var(--border-subtle)]"
                    >
                      <td className="px-3 py-2">
                        {u.email || (
                          <span className="text-[var(--text-muted)]">
                            (no email)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {u.plan || "free"}
                      </td>
                      <td className="px-3 py-2">
                        {u.is_admin ? "✅" : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] text-[11px] hover:bg-[var(--bg-elevated)]"
                        >
                          View details →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Loading users…
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
