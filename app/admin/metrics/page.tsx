"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Metrics = {
  totalUsers: number;
  proUsers: number;
  aiCallsToday: number;
  totalNotes: number;
  totalTasks: number;
};

export default function AdminMetricsPage() {
  const [stats, setStats] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("You do not have permission to view this page.");
        return;
      }

      const response = await fetch("/api/admin-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Failed to load metrics.");
        return;
      }
      setStats(result.metrics);
    }

    loadMetrics();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Admin Metrics</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!stats && !error && <p className="text-sm text-slate-400">Loading metrics...</p>}
        {stats && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { label: "Total users", value: stats.totalUsers },
            { label: "Pro users", value: stats.proUsers },
            { label: "AI calls today", value: stats.aiCallsToday },
            { label: "Notes total", value: stats.totalNotes },
            { label: "Tasks total", value: stats.totalTasks },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-400 mb-1">{c.label.toUpperCase()}</p>
              <p className="text-3xl font-extrabold">{c.value}</p>
            </div>
          ))}
        </div>
        )}
        <p className="text-[11px] text-slate-500 mt-6">
          (Tip) We can add time-series charts later; for now these top-line KPIs help you see traction quickly.
        </p>
      </div>
    </main>
  );
}
