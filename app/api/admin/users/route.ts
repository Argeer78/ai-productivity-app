// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

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
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, created_at, is_admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/users] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load users from database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      users: data || [],
    });
  } catch (err: any) {
    console.error("[admin/users] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
