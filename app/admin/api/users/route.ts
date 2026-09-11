// app/admin/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Simple UUID-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.error) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const plan = (searchParams.get("plan") || "all").trim(); // "all" | "free" | "pro"

    let query = supabaseAdmin
      .from("profiles")
      // 👇 REMOVE is_admin for now to rule it out as an issue
      .select("id, email, plan, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    // Plan filter
    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Search filter – ultra simple and valid
    if (q) {
      if (looksLikeUuid(q)) {
        // Exact id match
        query = query.eq("id", q);
      } else {
        // Email substring match
        query = query.ilike("email", `%${q}%`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/users] Supabase error:", error);

      // 👇 IMPORTANT: return the actual Supabase message in `error`
      return NextResponse.json(
        {
          ok: false,
          error: `Supabase error: ${error.message}`,
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
    console.error("[admin/users] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
