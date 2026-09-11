// app/api/admin-metrics/route.ts
import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const authError = adminAuthErrorResponse(admin);
    if (authError) return authError;

    const { count: totalUsers, error: usersErr } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (usersErr) throw usersErr;

    const { count: proUsers, error: proErr } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("plan", "pro");
    if (proErr) throw proErr;

    const { count: totalNotes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("*", { count: "exact", head: true });
    if (notesErr) throw notesErr;

    const { count: totalTasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("*", { count: "exact", head: true });
    if (tasksErr) throw tasksErr;

    const today = getTodayString();
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceStr = since.toISOString().split("T")[0];

    // AI Usage Counts (Total Calls)
    const { data: todayRows, error: todayErr } = await supabaseAdmin
      .from("ai_usage")
      .select("count, user_id")
      .eq("usage_date", today);
    if (todayErr) throw todayErr;

    const aiCallsToday =
      todayRows?.reduce((acc, row) => acc + (row.count || 0), 0) ?? 0;

    // DAU: Unique users who used AI today
    const dau = new Set(todayRows?.map(r => r.user_id)).size;

    const { data: weekRows, error: weekErr } = await supabaseAdmin
      .from("ai_usage")
      .select("count, user_id")
      .gte("usage_date", sinceStr)
      .lte("usage_date", today);
    if (weekErr) throw weekErr;

    const aiCalls7Days =
      weekRows?.reduce((acc, row) => acc + (row.count || 0), 0) ?? 0;

    // WAU: Unique users who used AI in last 7 days
    const wau = new Set(weekRows?.map(r => r.user_id)).size;

    // Feature Usage (Recent Creations)
    const { count: notes7d } = await supabaseAdmin
      .from("notes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceStr);

    const { count: tasks7d } = await supabaseAdmin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceStr);

    return NextResponse.json({
      ok: true,
      metrics: {
        totalUsers: totalUsers || 0,
        proUsers: proUsers || 0,
        totalNotes: totalNotes || 0,
        totalTasks: totalTasks || 0,
        aiCallsToday,
        aiCalls7Days,
        dau,
        wau,
        notes7d: notes7d || 0,
        tasks7d: tasks7d || 0,
      },
    });
  } catch (err) {
    console.error("[api/admin-metrics] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
