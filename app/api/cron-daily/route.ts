// app/api/cron-daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/verifyCron";
// import { resend } from "@/lib/resend"; // or your email client

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // 1) Load profiles that want daily email
    //    We treat either daily_digest_enabled OR wants_daily_digest as "yes"
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, daily_digest_enabled, wants_daily_digest, daily_digest_hour, ai_tone, focus_area"
      )
      .or("daily_digest_enabled.eq.true,wants_daily_digest.eq.true");

    if (error) {
      console.error("[cron-daily] profiles query error", error);
      throw error;
    }

    const now = new Date();
    const currentHour = now.getUTCHours(); // you can later convert based on user TZ

    const eligible = (profiles || []).filter((p) => {
      if (!p.email) return false;

      // Optional: naive per-hour filter using daily_digest_hour (string "HH")
      // If daily_digest_hour is null/empty, just send once whenever cron runs.
      if (!p.daily_digest_hour) return true;

      const [hourStr] = String(p.daily_digest_hour).split(":");
      const digestHour = Number(hourStr);
      if (Number.isNaN(digestHour)) return true;

      // Simple: compare UTC hour; can be improved with a timezone field later
      return digestHour === currentHour;
    });

    console.log(
      "[cron-daily] total profiles:",
      profiles?.length ?? 0,
      "eligible this run:",
      eligible.length
    );

    // 2) For each eligible user, generate digest & send email
    for (const profile of eligible) {
      const email = profile.email as string;
      const userId = profile.id as string;
      const aiTone = profile.ai_tone as string | null;
      const focusArea = profile.focus_area as string | null;

      // TODO: load the user's last 24h tasks/notes/etc:
      // const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      // const { data: tasks } = await supabase
      //   .from("tasks")
      //   .select("id, title, status")
      //   .eq("user_id", userId)
      //   .gte("created_at", since);

      // TODO: call your AI summary endpoint to build the "Daily Success" summary
      // const aiSummary = await getDailySummary({ tasks, aiTone, focusArea });

      // TODO: send via your provider
      // await resend.emails.send({
      //   from: "AI Productivity Hub <hi@aiprod.app>",
      //   to: email,
      //   subject: "Your Daily Success check-in ✨",
      //   html: `<p>Hi! Here's your daily check-in...</p>`,
      // });

      console.log("[cron-daily] would send daily digest to", email, {
        userId,
        aiTone,
        focusArea,
      });
    }

    return NextResponse.json({
      ok: true,
      totalProfiles: profiles?.length ?? 0,
      processed: eligible.length,
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
