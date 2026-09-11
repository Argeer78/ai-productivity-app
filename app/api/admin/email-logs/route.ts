import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  const authError = adminAuthErrorResponse(admin);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("email_logs")
    .select("id,created_at,user_id,email,type,subject,status,error_message")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin/email-logs] query failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load email logs" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, logs: data || [] });
}