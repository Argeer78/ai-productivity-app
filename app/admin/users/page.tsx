// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

type ProfileRow = {
  id: string;
  email: string | null;
  plan: "free" | "pro" | null;
  created_at: string | null;
  is_admin: boolean | null;
};

export default function AdminUsersPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Load current user & verify admin ----
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

  // ---- Load users (profiles) ----
  useEffect(() => {
    if (!authorized) return;

    async function loadUsers() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          // 👇 only select columns we are sure exist
          .select("id, email, plan, created_at, is_admin")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("[admin/users] profiles list error", error);
          setError(
            error.message || "Failed to load users."
          );
          return;
        }

        setRows((data || []) as ProfileRow[]);
      } catch (err: any) {
        console.error("[admin/users] unexpected error", err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [authorized]);

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
          <h1 className="text-2xl font-bold mb-3">Admin – Users</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            You need to log in to view the users list.
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
          <h1 className="text-2xl font-bold mb-3">Admin – Users</h1>
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

  // ---- Main render ----
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Users
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Read-only view of profiles (from <code>profiles</code> table).
              </p>
            </div>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to Admin
            </Link>
          </div>

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          {loading ? (
            <p className="text-slate-300 text-sm">
              Loading users…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-slate-300 text-sm">
              No users found in profiles.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-[12px]">
                <thead className="text-slate-400 bg-slate-900/80">
                  <tr>
                    <th className="px-3 py-2">User ID</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Admin</th>
                    <th className="px-3 py-2">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-100 break-all">
                        {row.id}
                      </td>
                      <td className="px-3 py-2 text-slate-100">
                        {row.plan || "free"}
                      </td>
                      <td className="px-3 py-2">
                        {row.is_admin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-200">
                            yes
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                            no
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
