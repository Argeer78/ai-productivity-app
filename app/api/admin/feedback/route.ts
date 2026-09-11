import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  const authError = adminAuthErrorResponse(admin);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .select("id,user_id,email,message,source,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/feedback] query failed", error.message);
    return NextResponse.json({ ok: false, error: "Failed to load feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
