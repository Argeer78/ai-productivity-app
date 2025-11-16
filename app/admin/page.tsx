"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import Link from "next/link";
import TravelAnalyticsCard from "./TravelAnalyticsCard";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

type Metrics = {
  totalUsers: number;
  proUsers: number;
  totalNotes: number;
  totalTasks: number;
  aiCallsToday: number;
  aiCalls7Days: number;
  activeAiUsers7Days: number;
  topAiUsers7Days: {
    userId: string;
    totalCalls: number;
  }[];
};

type ActivityItem = {
  id: string;
  type: "note" | "task" | "trip";
  created_at: string;
  user_id: string;
  title: string;
};

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load current user
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
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Fetch metrics + activity if admin
  useEffect(() => {
    if (!authorized) return;

    async function loadMetricsAndActivity() {
      setLoading(true);
      setError("");
      try {
        // 1) Total users
        const { count: totalUsers, error: usersErr } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (usersErr) throw usersErr;

        // 2) Pro users
        const { count: proUsers, error: proErr } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("plan", "pro");

        if (proErr) throw proErr;

        // 3) Notes
        const { count: totalNotes, error: notesErr } = await supabase
          .from("notes")
          .select("*", { count: "exact", head: true });

        if (notesErr) throw notesErr;

        // 4) Tasks
        const { count: totalTasks, error: tasksErr } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true });

        if (tasksErr) throw tasksErr;

        // 5) AI usage
        const today = getTodayString();
        const since = new Date();
        since.setDate(since.getDate() - 6); // last 7 days incl. today
        const sinceStr = since.toISOString().split("T")[0];

        // Today total AI calls (across all users)
        const { data: todayRows, error: todayErr } = await supabase
          .from("ai_usage")
          .select("count")
          .eq("usage_date", today);

        if (todayErr) throw todayErr;

        const aiCallsToday =
          todayRows?.reduce((acc, row) => acc + (row.count || 0), 0) ?? 0;

        // Last 7 days – by user
        const { data: weekRows, error: weekErr } = await supabase
          .from("ai_usage")
          .select("user_id, count")
          .gte("usage_date", sinceStr)
          .lte("usage_date", today);

        if (weekErr) throw weekErr;

        const usageByUser = new Map<string, number>();
        let aiCalls7Days = 0;

        (weekRows || []).forEach((row: any) => {
          const uid = row.user_id as string;
          const c = row.count || 0;
          aiCalls7Days += c;
          if (!uid) return;
          usageByUser.set(uid, (usageByUser.get(uid) || 0) + c);
        });

        const activeAiUsers7Days = usageByUser.size;

        const topAiUsers7Days = Array.from(usageByUser.entries())
          .map(([userId, totalCalls]) => ({ userId, totalCalls }))
          .sort((a, b) => b.totalCalls - a.totalCalls)
          .slice(0, 10);

        setMetrics({
          totalUsers: totalUsers || 0,
          proUsers: proUsers || 0,
          totalNotes: totalNotes || 0,
          totalTasks: totalTasks || 0,
          aiCallsToday,
          aiCalls7Days,
          activeAiUsers7Days,
          topAiUsers7Days,
        });

        // 6) Recent activity (last items from notes, tasks, trips)
        const [
          { data: recentNotes },
          { data: recentTasks },
          { data: recentTrips },
        ] = await Promise.all([
          supabase
            .from("notes")
            .select("id, user_id, title, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("tasks")
            .select("id, user_id, title, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("travel_plans")
            .select("id, user_id, destination, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const activity: ActivityItem[] = [];

        (recentNotes || []).forEach((row: any) => {
          activity.push({
            id: row.id,
            type: "note",
            created_at: row.created_at,
            user_id: row.user_id,
            title: row.title || "(untitled note)",
          });
        });

        (recentTasks || []).forEach((row: any) => {
          activity.push({
            id: row.id,
            type: "task",
            created_at: row.created_at,
            user_id: row.user_id,
            title: row.title || "(untitled task)",
          });
        });

        (recentTrips || []).forEach((row: any) => {
          activity.push({
            id: row.id,
            type: "trip",
            created_at: row.created_at,
            user_id: row.user_id,
            title: row.destination || "(trip)",
          });
        });

        activity.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

        setRecentActivity(activity.slice(0, 12));
      } catch (err: any) {
        console.error(err);
        setError("Failed to load admin metrics.");
      } finally {
        setLoading(false);
      }
    }

    loadMetricsAndActivity();
  }, [authorized]);

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
            You need to log in to view admin analytics.
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Admin Analytics
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mb-6">
            High-level overview of users, plans, notes, tasks, AI usage, and travel.
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-400">{error}</div>
          )}

          {loading || !metrics ? (
            <p className="text-slate-300 text-sm">Loading metrics…</p>
          ) : (
            <>
              {/* Top stats */}
              <div className="grid md:grid-cols-3 gap-4 mb-8 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    USERS
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.totalUsers}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Total users in <code>profiles</code>.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    PRO USERS
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.proUsers}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Plan = <code>pro</code> in profiles.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    PRO CONVERSION
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.totalUsers > 0
                      ? `${Math.round(
                          (metrics.proUsers / metrics.totalUsers) * 100
                        )}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Approximate free → pro rate.
                  </p>
                </div>
              </div>

              {/* Content stats */}
              <div className="grid md:grid-cols-2 gap-4 mb-8 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    NOTES
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.totalNotes}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Total rows in <code>notes</code>.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    TASKS
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.totalTasks}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Total rows in <code>tasks</code>.
                  </p>
                </div>
              </div>

              {/* AI usage stats */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm mb-8">
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  AI USAGE
                </p>
                <p className="text-slate-100 mb-1">
                  Today:{" "}
                  <span className="font-bold">
                    {metrics.aiCallsToday}
                  </span>{" "}
                  AI calls
                </p>
                <p className="text-slate-100 mb-1">
                  Last 7 days:{" "}
                  <span className="font-bold">
                    {metrics.aiCalls7Days}
                  </span>{" "}
                  AI calls across{" "}
                  <span className="font-bold">
                    {metrics.activeAiUsers7Days}
                  </span>{" "}
                  active users
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Based on sums from <code>ai_usage</code> across all users.
                </p>
              </div>

              {/* Top AI users table */}
              {metrics.topAiUsers7Days.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm mb-8">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    TOP AI USERS (LAST 7 DAYS)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="py-1 pr-4">#</th>
                          <th className="py-1 pr-4">User ID</th>
                          <th className="py-1 text-right">AI calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topAiUsers7Days.map((row, idx) => (
                          <tr
                            key={row.userId}
                            className="border-t border-slate-800"
                          >
                            <td className="py-1.5 pr-4 text-slate-300">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 pr-4 text-slate-300 font-mono text-[11px] break-all">
                              {row.userId}
                            </td>
                            <td className="py-1.5 text-right text-slate-100">
                              {row.totalCalls}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    For now this uses user IDs. If you later store emails in{" "}
                    <code>profiles</code>, we can show them here.
                  </p>
                </div>
              )}

              {/* Travel analytics card (tiny block) */}
              <div className="mb-8">
                <TravelAnalyticsCard />
              </div>

              {/* Recent activity log */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm mb-8">
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  RECENT ACTIVITY
                </p>
                {recentActivity.length === 0 ? (
                  <p className="text-[12px] text-slate-400">
                    No recent activity found.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-[12px]">
                    {recentActivity.map((item) => (
                      <li
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                              item.type === "note"
                                ? "bg-sky-500/20 text-sky-200"
                                : item.type === "task"
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-indigo-500/20 text-indigo-200"
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="truncate text-slate-100">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
