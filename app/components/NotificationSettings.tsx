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
    const now = new Date();
    const hour = now.getUTCHours();

    // Example: only run between 7 and 21 UTC
    if (hour < 7 || hour > 21) {
      return NextResponse.json({ ok: true, skipped: "outside time window" });
    }

    // Example: get users who want reminders
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, onboarding_reminder")
      .in("onboarding_reminder", ["daily", "weekly"]);

    if (error) throw error;

    for (const profile of profiles || []) {
      // Logic example:
      // - if daily: maybe 1 nudge per day at around a certain hour
      // - if weekly: only nudge on a certain weekday
      // - record last_nudged_at in a separate table to avoid spamming

      // TODO: send email / push / etc.
    }

    return NextResponse.json({
      ok: true,
      processed: profiles?.length || 0,
    });
  } catch (err) {
    console.error("[cron-notifications] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
