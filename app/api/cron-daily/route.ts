// app/api/cron-daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/verifyCron";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const fromCron = req.headers.get("x-vercel-cron") === "1";
  const nowIso = new Date().toISOString();

  console.log("[cron-daily] START", {
    fromCron,
    nowIso,
    userAgent: req.headers.get("user-agent"),
  });

  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, daily_digest_enabled, wants_daily_digest, daily_digest_hour"
      );

    if (error) {
      console.error("[cron-daily] profiles query error", error);
      throw error;
    }

    // ✅ Very simple eligibility rule for now:
    // - must have email
    // - opted in via daily_digest_enabled or wants_daily_digest
    const eligible = (profiles || []).filter((p) => {
      const enabled =
        !!p.daily_digest_enabled || !!p.wants_daily_digest;
      const hasEmail = !!p.email;
      return enabled && hasEmail;
    });

    console.log("[cron-daily] profiles", {
      totalProfiles: profiles?.length ?? 0,
      eligible: eligible.length,
      sample: eligible.slice(0, 5).map((p) => ({
        id: p.id,
        email: p.email,
        daily_digest_enabled: p.daily_digest_enabled,
        wants_daily_digest: p.wants_daily_digest,
        daily_digest_hour: p.daily_digest_hour,
      })),
    });

    let sentCount = 0;

    for (const profile of eligible) {
      const email = profile.email as string;
      const userId = profile.id as string;

      // TODO: call your real email-sending function here
      console.log("[cron-daily] would send email to", email, {
        userId,
      });

      // Example:
      // await resend.emails.send({ ... });

      sentCount++;
    }

    console.log("[cron-daily] DONE", {
      fromCron,
      sentCount,
    });

    return NextResponse.json({
      ok: true,
      message: `Daily digest processed for ${
        eligible.length
      } profiles, attempted ${eligible.length}, sent ${sentCount}.`,
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
