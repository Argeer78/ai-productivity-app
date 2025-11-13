// app/api/daily-digest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendDailyDigest } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1) Auth check with CRON_SECRET
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error("[daily-digest] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (authHeader !== expected) {
    console.warn("[daily-digest] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2) Load all subscribed profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, ai_tone, focus_area, daily_digest_enabled")
      .eq("daily_digest_enabled", true)   // 🔴 make sure this column exists
      .not("email", "is", null);

    if (error) {
      console.error("[daily-digest] profiles query error", error);
      return NextResponse.json(
        { ok: false, error: "DB error loading profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log("[daily-digest] No subscribers found");
      return NextResponse.json({
        ok: true,
        message: "No subscribers for daily digest.",
      });
    }

    let attempted = 0;
    let sent = 0;

    // 3) Loop over subscribed users and send emails
    for (const profile of profiles) {
      const email = profile.email as string | null;
      if (!email) continue;

      attempted++;

      await sendDailyDigest({
        userId: profile.id,
        email,
        aiTone: profile.ai_tone,
        focusArea: profile.focus_area,
      });

      // sendDailyDigest handles its own errors, so if we reach here,
      // we consider it "attempted"
      sent++;
    }

    return NextResponse.json({
      ok: true,
      message: `Daily digest processed for ${profiles.length} profiles, attempted ${attempted}, sent ${sent}.`,
    });
  } catch (err: any) {
    console.error("[daily-digest] handler error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error in daily digest." },
      { status: 500 }
    );
  }
}
