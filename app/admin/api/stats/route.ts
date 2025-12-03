// app/admin/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const adminKeyHeader = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    console.error("[admin/stats] ADMIN_KEY env not set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (adminKeyHeader !== expected) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const [{ count: totalUsers }, { count: proUsers }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("plan", "pro"),
    ]);

    const [{ count: notesCount }, { count: tasksCount }] = await Promise.all([
      supabaseAdmin
        .from("notes")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("tasks")
        .select("id", { count: "exact", head: true }),
    ]);

    // Last 7 days AI usage
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from("ai_usage")
      .select("user_id, count")
      .gte("usage_date", sinceStr);

    if (usageErr) {
      console.error("[admin/stats] ai_usage error", usageErr);
    }

    const safeUsage = usageRows || [];
    const aiCalls7d = safeUsage.reduce(
      (sum, row: any) => sum + (row.count || 0),
      0
    );
    const uniqueUsers = new Set(
      safeUsage.map((row: any) => row.user_id).filter(Boolean)
    );
    const weeklyActiveUsers = uniqueUsers.size;

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers: totalUsers || 0,
        proUsers: proUsers || 0,
        weeklyActiveUsers,
        aiCalls7d,
        notesCount: notesCount || 0,
        tasksCount: tasksCount || 0,
      },
    });
  } catch (err: any) {
    console.error("[admin/stats] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
