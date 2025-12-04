// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

// Simple UUID v4-ish check
function looksLikeUuid(str: string) {
  return /^[0-9a-fA-F-]{36}$/.test(str);
}

export async function GET(req: Request) {
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
    const plan = (searchParams.get("plan") || "").trim(); // "all" | "free" | "pro"

    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at, is_admin", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter by plan if needed
    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Build OR filters safely
    if (q.length > 0) {
      const filters: string[] = [];

      // Always search by email substring
      filters.push(`email.ilike.%${q}%`);

      // Only search by id if q looks like a UUID
      if (looksLikeUuid(q)) {
        filters.push(`id.eq.${q}`);
      }

      query = query.or(filters.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/users] Supabase error:", error);
      // In dev it's often useful to see the real message:
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to load users from database.",
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
