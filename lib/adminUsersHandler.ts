// lib/adminUsersHandler.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Simple UUID-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function adminUsersGET(req: NextRequest) {
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
      // keep it simple, these columns exist in your local DB
      .select("id, email, plan, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    if (q) {
      if (looksLikeUuid(q)) {
        query = query.eq("id", q);
      } else {
        query = query.ilike("email", `%${q}%`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/users] Supabase error:", error);

      // IMPORTANT: expose the real message so you see what’s wrong in prod DB
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
