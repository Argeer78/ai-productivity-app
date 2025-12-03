// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

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
  const [me, setMe] = useState<any | null>(null);
  const [checkingMe, setCheckingMe] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");

  // Load current user and check admin email
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
        console.error("[admin/users] loadMe error", err);
      } finally {
        setCheckingMe(false);
      }
    }
    loadMe();
  }, []);

  // Load all users via admin API
  useEffect(() => {
    if (!authorized) return;
    if (!ADMIN_KEY) {
      setError("Admin key (NEXT_PUBLIC_ADMIN_KEY) is not configured.");
      return;
    }

    async function loadUsers() {
      setLoadingUsers(true);
      setError("");

      try {
        const res = await fetch("/api/admin/users", {
          headers: {
            "x-admin-key": ADMIN_KEY,
          },
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch (parseErr) {
          console.error("[admin/users] JSON parse error", parseErr);
          throw new Error("Invalid JSON response from /api/admin/users");
        }

        if (!res.ok || !json?.ok) {
          console.error("[admin/users] API error", res.status, json);
          throw new Error(json?.error || "Failed to load users");
        }

        setUsers(json.users || []);
      } catch (err: any) {
        console.error("[admin/users] loadUsers error", err);
        setError(err?.message || "Failed to load users.");
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [authorized]);

  // ---- Guards ----
  if (checkingMe) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Checking your session…</p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin – Users</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center max-w-sm">
            You need to log in to access the admin users view.
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
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center max-w-sm">
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

  // ---- Main content ----
  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Users</h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                View all profiles, plans, and admin flags.
              </p>
            </div>
            <div className="flex flex-col items-end text-[11px] text-[var(--text-muted)]">
              <span>
                Logged in as{" "}
                <span className="font-mono text-[var(--text-main)]">
                  {me.email}
                </span>
              </span>
              <Link
                href="/admin"
                className="mt-1 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                ← Back to Admin dashboard
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3 whitespace-pre-line">
              {error}
            </p>
          )}

          {loadingUsers ? (
            <p className="text-sm text-[var(--text-muted)]">
              Loading users…
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Plan</th>
                    <th className="text-left px-3 py-2">Admin</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                    >
                      <td className="px-3 py-2">
                        {u.email || (
                          <span className="text-[var(--text-muted)]">
                            (no email)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {u.plan || (
                          <span className="text-[var(--text-muted)]">free</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {u.is_admin ? "✅" : "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-[11px] text-[var(--accent)] hover:underline"
                        >
                          View details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[11px] text-[var(--text-muted)]">
            Data comes from the <code>profiles</code> table via a protected
            admin API route.
          </p>
        </div>
      </div>
    </main>
  );
}
