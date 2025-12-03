// app/admin/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const adminKeyHeader = req.headers.get("x-admin-key") || "";
  const expected =
    process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

  if (!expected) {
    console.error("[admin/users] ADMIN_KEY / NEXT_PUBLIC_ADMIN_KEY not set");
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
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const plan = (searchParams.get("plan") || "all").trim();

    // Base query
    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at", { count: "exact" });

    // Plan filter
    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Search filter
    if (q) {
      // Search email ilike and also exact id match
      const pattern = `%${q}%`;
      query = query.or(`email.ilike.${pattern},id.eq.${q}`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/users] query error", error);
      return NextResponse.json(
        { ok: false, error: "DB error loading users" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      users: data || [],
      total: count ?? (data?.length || 0),
    });
  } catch (err) {
    console.error("[admin/users] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
