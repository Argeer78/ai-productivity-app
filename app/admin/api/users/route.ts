import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Simple UUID-ish check so we don't crash on non-UUID strings
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: NextRequest) {
  const adminKeyHeader = req.headers.get("x-admin-key") || "";

  const allowedKeys = [
    process.env.ADMIN_API_KEY,
    process.env.ADMIN_KEY,
    process.env.NEXT_PUBLIC_ADMIN_KEY,
  ].filter(Boolean) as string[];

  if (allowedKeys.length === 0) {
    console.error("[admin/users] no admin key envs set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (!allowedKeys.includes(adminKeyHeader)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const plan = (searchParams.get("plan") || "all").trim();

    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at, is_admin", { count: "exact" });

    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    if (q) {
      const pattern = `%${q}%`;

      if (looksLikeUuid(q)) {
        query = query.or(`email.ilike.${pattern},id.eq.${q}`);
      } else {
        query = query.ilike("email", pattern);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/users] query error", error);
      return NextResponse.json(
        { ok: false, error: "DB error loading users", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      users: data || [],
      total: count ?? (data?.length || 0),
    });
  } catch (err: any) {
    console.error("[admin/users] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error loading users" },
      { status: 500 }
    );
  }
}
