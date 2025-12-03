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
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, weekly_report_enabled")
      .eq("weekly_report_enabled", true);

    if (error) throw error;

    for (const profile of profiles || []) {
      // TODO:
      // - compute last 7 days scores from daily_scores
      // - tasks completed, notes count, streak, etc.
      // - generate AI summary (call your /api/weekly-report-ai or similar)
      // - send email
    }

    return NextResponse.json({
      ok: true,
      processed: profiles?.length || 0,
    });
  } catch (err) {
    console.error("[cron-weekly] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
