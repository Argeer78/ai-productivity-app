// app/api/cron-weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/verifyCron";
// import { resend } from "@/lib/resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, weekly_report_enabled, ai_tone, focus_area, onboarding_weekly_focus"
      )
      .eq("weekly_report_enabled", true);

    if (error) {
      console.error("[cron-weekly] profiles query error", error);
      throw error;
    }

    const eligible = (profiles || []).filter((p) => p.email);
    console.log(
      "[cron-weekly] eligible users:",
      eligible.length,
      "raw rows:",
      profiles?.length ?? 0
    );

    const now = new Date();
    const weekEnd = now.toISOString();

    for (const profile of eligible) {
      const email = profile.email as string;
      const userId = profile.id as string;
      const aiTone = profile.ai_tone as string | null;
      const focusArea = profile.focus_area as string | null;
      const weeklyFocus = profile.onboarding_weekly_focus as string | null;

      // TODO: load last 7 days of scores/tasks/notes
      // const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // const { data: scores } = await supabase
      //   .from("daily_success")
      //   .select("date, score")
      //   .eq("user_id", userId)
      //   .gte("date", sevenDaysAgo);

      // TODO: maybe create a `weekly_reports` row *and* send email
      // const aiWeeklySummary = await getWeeklySummary({ scores, focusArea, weeklyFocus, aiTone });

      // await supabase.from("weekly_reports").insert([
      //   {
      //     user_id: userId,
      //     report_date: weekEnd,
      //     summary: aiWeeklySummary,
      //   },
      // ]);

      // await resend.emails.send({
      //   from: "AI Productivity Hub <hi@aiprod.app>",
      //   to: email,
      //   subject: "Your Weekly AI Productivity Report",
      //   html: `<p>Hi! Here's your weekly report...</p>`,
      // });

      console.log("[cron-weekly] would send weekly report to", email, {
        userId,
        focusArea,
        weeklyFocus,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: eligible.length,
    });
  } catch (err) {
    console.error("[cron-weekly] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
