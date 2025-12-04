// app/admin/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type UserStats = {
  notesCount: number;
  tasksCount: number;
  tripsCount: number;
  totalAiCalls: number;
  lastAiDate: string | null;
};

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/api/users/:id] NEXT_PUBLIC_ADMIN_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Admin key is not configured on the server." },
      { status: 500 }
    );
  }

  if (headerKey !== ADMIN_KEY) {
    console.warn("[admin/api/users/:id] Unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // ["admin","api","users","<id>"]
  const userId = segments[segments.length - 1];

  if (!userId || userId === "undefined") {
    console.error("[admin/api/users/:id] Invalid userId:", userId);
    return NextResponse.json(
      { ok: false, error: "Invalid or missing user id in URL." },
      { status: 400 }
    );
  }

  try {
    // Profile
    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[admin/api/users/:id] profile error", profileErr);
      return NextResponse.json(
        {
          ok: false,
          error:
            profileErr.message ||
            "Failed to load user profile from Supabase.",
        },
        { status: 500 }
      );
    }

    if (!profileRow) {
      console.warn("[admin/api/users/:id] No profile row found", userId);
      const emptyStats: UserStats = {
        notesCount: 0,
        tasksCount: 0,
        tripsCount: 0,
        totalAiCalls: 0,
        lastAiDate: null,
      };

      return NextResponse.json({
        ok: true,
        profile: null,
        stats: emptyStats,
      });
    }

    // Notes
    const { count: notesCount } = await supabaseAdmin
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Tasks
    const { count: tasksCount } = await supabaseAdmin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Trips
    const { count: tripsCount } = await supabaseAdmin
      .from("travel_plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // AI usage last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from("ai_usage")
      .select("usage_date, count")
      .eq("user_id", userId)
      .gte("usage_date", sinceStr)
      .order("usage_date", { ascending: false });

    if (usageErr) {
      console.error("[admin/api/users/:id] ai_usage error", usageErr);
    }

    let totalAiCalls = 0;
    let lastAiDate: string | null = null;

    (usageRows || []).forEach((row: any) => {
      totalAiCalls += row.count || 0;
    });

    if (usageRows && usageRows.length > 0) {
      lastAiDate = usageRows[0].usage_date;
    }

    const stats: UserStats = {
      notesCount: notesCount || 0,
      tasksCount: tasksCount || 0,
      tripsCount: tripsCount || 0,
      totalAiCalls,
      lastAiDate,
    };

    return NextResponse.json({
      ok: true,
      profile: profileRow,
      stats,
    });
  } catch (err: any) {
    console.error("[admin/api/users/:id] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message || "Unexpected server error in admin user route.",
      },
      { status: 500 }
    );
  }
}
