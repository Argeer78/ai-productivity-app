// app/admin/reset-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Make sure these are set in your env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client (server only!)
const adminClient = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string }
      | null;

    if (!body?.email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`
      : undefined;

    // ✅ In v2, use auth.resetPasswordForEmail (NOT auth.admin.resetPasswordForEmail)
    const { error } = await adminClient.auth.resetPasswordForEmail(
      body.email,
      { redirectTo }
    );

    if (error) {
      console.error("[admin reset-password] supabase error", error);
      return NextResponse.json(
        { ok: false, error: error.message },
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
