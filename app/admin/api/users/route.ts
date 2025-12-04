// app/admin/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Use the same key as the client
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Simple UUID-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";

  if (!ADMIN_KEY) {
    console.error("[admin/users] NEXT_PUBLIC_ADMIN_KEY is not set on server");
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
