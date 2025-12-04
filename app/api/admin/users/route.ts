// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Same key as the client uses
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Simple UUID-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/users] NEXT_PUBLIC_ADMIN_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Admin key is not configured on the server." },
      { status: 500 }
    );
  }

  if (headerKey !== ADMIN_KEY) {
    console.warn("[admin/users] Unauthorized request");
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
      .select("id, email, plan, created_at, is_admin", { count: "exact" });

    // Plan filter
    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Search filter
    if (q) {
      const pattern = `%${q}%`;

      if (looksLikeUuid(q)) {
        // Email substring OR exact UUID id
        query = query.or(`email.ilike.${pattern},id.eq.${q}`);
      } else {
        // Only email substring if not UUID
        query = query.ilike("email", pattern);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/users] query error", error);
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
