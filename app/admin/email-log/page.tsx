"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type EmailLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  type: string | null; // "daily_digest" | "test_email" | etc.
  subject: string | null;
  status: string | null; // "sent" | "error" | "skipped"
  error_message: string | null;
};

type FilterType = "all" | "daily_digest" | "test_email" | "other";
type FilterStatus = "all" | "sent" | "error" | "skipped";

export default function AdminEmailLogPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const adminEmail =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "sgouros2305@gmail.com";

  // 1) Load current user email
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
        }
        setUserEmail(data?.user?.email ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  // 2) Load email logs
  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200); // you can bump this if needed

      if (error) throw error;
      setLogs((data || []) as EmailLog[]);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load email logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userEmail || userEmail !== adminEmail) return;
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, adminEmail]);

  // 3) Derived filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // type filter
      if (typeFilter !== "all") {
        if (typeFilter === "other") {
          if (log.type === "daily_digest" || log.type === "test_email") {
            return false;
          }
        } else if (log.type !== typeFilter) {
          return false;
        }
      }

      // status filter
      if (statusFilter !== "all") {
        if ((log.status || "").toLowerCase() !== statusFilter) {
          return false;
        }
      }

      // date range filter
      if (fromDate) {
        const from = new Date(fromDate);
        const created = new Date(log.created_at);
        if (created < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        const created = new Date(log.created_at);
        // include entire "to" day → add 1 day
        const toEnd = new Date(to);
        toEnd.setDate(toEnd.getDate() + 1);
        if (created >= toEnd) return false;
      }

      return true;
    });
  }, [logs, typeFilter, statusFilter, fromDate, toDate]);

  // 4) Gate by admin
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session…</p>
      </main>
    );
  }

  if (!userEmail || userEmail !== adminEmail) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="admin" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Admin — Email Log</h1>
          <p className="text-slate-300 text-sm text-center max-w-sm">
            You must be logged in as{" "}
            <span className="font-mono break-all">{adminEmail}</span> to view
            this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="admin" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Email Log
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Inspect daily digest and test emails sent by the system.
              </p>
            </div>

            <div className="text-xs text-slate-400">
              <p>
                Showing{" "}
                <span className="font-semibold">
                  {filteredLogs.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {logs.length}
                </span>{" "}
                logs
              </p>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="mt-1 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 disabled:opacity-60"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 text-sm text-red-400">{error}</div>
          )}

          {/* Filters bar */}
          <div className="mb-5 border border-slate-800 bg-slate-900/70 rounded-2xl p-3 text-xs md:text-sm">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Type filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as FilterType)
                  }
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                >
                  <option value="all">All</option>
                  <option value="daily_digest">Daily digest</option>
                  <option value="test_email">Test email</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as FilterStatus)
                  }
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="error">Error</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>

              {/* Date from */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                />
              </div>

              {/* Date to */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                />
              </div>

              {/* Clear button */}
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setFromDate("");
                    setToDate("");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 text-xs md:text-sm">
            <div className="grid grid-cols-[auto,auto,1fr,auto,auto] gap-3 px-3 py-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span>Time</span>
              <span>Type</span>
              <span>Email / Subject</span>
              <span>Status</span>
              <span>Error</span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-slate-400">
                No email logs match these filters.
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[auto,auto,1fr,auto,auto] gap-3 px-3 py-2 border-b border-slate-800 last:border-b-0"
                  >
                    {/* Time */}
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>

                    {/* Type */}
                    <span className="text-[11px]">
                      {log.type || "—"}
                    </span>

                    {/* Email / Subject */}
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[11px] truncate">
                        {log.email || "—"}
                      </span>
                      <span className="text-[11px] text-slate-300 truncate">
                        {log.subject || "(no subject)"}
                      </span>
                    </div>

                    {/* Status */}
                    <span
                      className={`text-[11px] ${
                        log.status === "sent"
                          ? "text-emerald-400"
                          : log.status === "error"
                          ? "text-red-400"
                          : log.status === "skipped"
                          ? "text-amber-300"
                          : "text-slate-400"
                      }`}
                    >
                      {log.status || "—"}
                    </span>

                    {/* Error message */}
                    <span className="text-[11px] text-red-300 line-clamp-2">
                      {log.error_message || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
