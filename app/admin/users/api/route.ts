// app/admin/users/api/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const adminKeyHeader = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    console.error("[admin/users] ADMIN_KEY env not set");
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

    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at, is_admin")
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) {
      if (q.includes("@")) {
        // email search
        query = query.ilike("email", `%${q}%`);
      } else {
        // match id exactly OR email contains query
        query = query.or(`id.eq.${q},email.ilike.%${q}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/users] query error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, users: data || [] });
  } catch (err: any) {
    console.error("[admin/users] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error loading users" },
      { status: 500 }
    );
  }
}
