import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/verifyCron";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // 1) Load users who enabled daily digest
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, daily_digest_enabled")
      .eq("daily_digest_enabled", true);

    if (error) throw error;

    // 2) For each user, generate digest & send email (pseudo-code)
    for (const profile of profiles || []) {
      // TODO: load tasks/notes for last 24h
      // TODO: call your AI summary endpoint if needed
      // TODO: send email using Resend or other provider
    }

    return NextResponse.json({
      ok: true,
      processed: profiles?.length || 0,
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
