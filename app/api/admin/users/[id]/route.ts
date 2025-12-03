// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type UserStats = {
  notesCount: number;
  tasksCount: number;
  tripsCount: number;
  totalAiCalls: number;
  lastAiDate: string | null;
};

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/users/:id] NEXT_PUBLIC_ADMIN_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Admin key is not configured on the server." },
      { status: 500 }
    );
  }

  if (headerKey !== ADMIN_KEY) {
    console.warn("[admin/users/:id] Unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = context.params.id;

  try {
    // Profile
    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[admin/users/:id] profile error", profileErr);
      return NextResponse.json(
        { ok: false, error: "Failed to load user profile." },
        { status: 500 }
      );
    }

    if (!profileRow) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 }
      );
    }

    // Notes count
    const { count: notesCount, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (notesErr) {
      console.error("[admin/users/:id] notes count error", notesErr);
    }

    // Tasks count
    const { count: tasksCount, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (tasksErr) {
      console.error("[admin/users/:id] tasks count error", tasksErr);
    }

    // Trips count
    const { count: tripsCount, error: tripsErr } = await supabaseAdmin
      .from("travel_plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (tripsErr) {
      console.error("[admin/users/:id] trips count error", tripsErr);
    }

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
      console.error("[admin/users/:id] ai_usage error", usageErr);
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
    console.error("[admin/users/:id] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
