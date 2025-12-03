// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function runNotifications(): Promise<{ ok: boolean; processed: number }> {
  // TODO: your notification logic here
  // e.g. push reminders, etc.
  const processed = 0;
  return { ok: true, processed };
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const result = await runNotifications();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[notifications] error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
