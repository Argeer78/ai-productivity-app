// app/admin/reset-password/route.ts
import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const authError = adminAuthErrorResponse(admin);
    if (authError) return authError;

    const body = (await req.json().catch(() => null)) as
      | { email?: string }
      | null;

    if (!body?.email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    const redirectTo = appUrl
      ? `${appUrl.replace(/\/+$/, "")}/auth/reset`
      : undefined;

    // ✅ In v2, use auth.resetPasswordForEmail (NOT auth.admin.resetPasswordForEmail)
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      body.email,
      { redirectTo }
    );

    if (error) {
      console.error("[admin reset-password] supabase error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to send reset email" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[admin reset-password] route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
