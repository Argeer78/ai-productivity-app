// app/admin/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Simple UUID-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/api/users] NEXT_PUBLIC_ADMIN_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Admin key is not configured on the server." },
      { status: 500 }
    );
  }

  if (headerKey !== ADMIN_KEY) {
    console.warn("[admin/api/users] Unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const plan = (searchParams.get("plan") || "all").trim(); // "all" | "free" | "pro"

    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at, is_admin", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    // Plan filter
    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Search filter
    if (q) {
      const pattern = `%${q}%`;

      if (looksLikeUuid(q)) {
        // email substring OR exact UUID id
        query = query.or(`email.ilike.${pattern},id.eq.${q}`);
      } else {
        // email substring only
        query = query.ilike("email", pattern);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/api/users] Supabase error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "DB error loading users",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      users: data || [],
      total: typeof count === "number" ? count : (data || []).length,
    });
  } catch (err: any) {
    console.error("[admin/api/users] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
