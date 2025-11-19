// app/api/admin/reset-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // NOT public

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
      : undefined;

    const { error } = await adminClient.auth.admin.resetPasswordForEmail(
      body.email,
      { redirectTo }
    );

    if (error) {
      console.error("[api/admin/reset-password] supabase error", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[api/admin/reset-password] exception", err);
    return NextResponse.json(
      { ok: false, error: "Server error while sending reset email" },
      { status: 500 }
    );
  }
}
