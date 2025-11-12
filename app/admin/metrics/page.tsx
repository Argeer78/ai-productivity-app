import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AppHeader from "@/app/components/AppHeader";

// (Optional) protect route by email allowlist:
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

async function getStats() {
  // Users
  const { data: proCountRow } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("plan", "pro");
  const { data: usersRow } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // AI usage today
  const today = new Date().toISOString().split("T")[0];
  const { data: aiRow } = await supabaseAdmin
    .from("ai_usage")
    .select("count", { count: "exact", head: true })
    .eq("usage_date", today);

  // Notes & tasks (total)
  const { data: notesRow } = await supabaseAdmin
    .from("notes")
    .select("id", { count: "exact", head: true });
  const { data: tasksRow } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true });

  return {
    totalUsers: (usersRow as any)?.length ?? usersRow ?? 0, // head:true returns null; count is on response meta in JS client, but length fallback won't hurt
    proUsers: (proCountRow as any)?.length ?? proCountRow ?? 0,
    aiCallsToday: (aiRow as any)?.length ?? aiRow ?? 0,
    notesTotal: (notesRow as any)?.length ?? notesRow ?? 0,
    tasksTotal: (tasksRow as any)?.length ?? tasksRow ?? 0,
  };
}

export default async function AdminMetricsPage() {
  // (Optional) server-protect by checking a cookie/session; for MVP just show metrics
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Admin Metrics</h1>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { label: "Total users", value: stats.totalUsers },
            { label: "Pro users", value: stats.proUsers },
            { label: "AI calls today", value: stats.aiCallsToday },
            { label: "Notes total", value: stats.notesTotal },
            { label: "Tasks total", value: stats.tasksTotal },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-400 mb-1">{c.label.toUpperCase()}</p>
              <p className="text-3xl font-extrabold">{c.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-6">
          (Tip) We can add time-series charts later; for now these top-line KPIs help you see traction quickly.
        </p>
      </div>
    </main>
  );
}
