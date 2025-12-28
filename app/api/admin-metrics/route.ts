// app/api/admin-metrics/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: Request) {
  try {
    // 1) Read access token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const token = authHeader.slice("Bearer ".length);

    // 2) Verify user via anon client + token
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // 3) Use supabaseAdmin (service role) for global metrics
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
