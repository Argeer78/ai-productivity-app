// app/api/daily-digest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderDailyDigestEmail } from "@/lib/emailTemplates";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

export async function POST(req: Request) {
  // 1) Verify CRON_SECRET
  const incoming = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error("[daily-digest] CRON_SECRET is NOT set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (incoming !== expected) {
    console.warn("[daily-digest] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2) Load subscribed users
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, ai_tone, focus_area, daily_digest_enabled")
      .eq("daily_digest_enabled", true)
      .not("email", "is", null);

    if (error) {
      console.error("[daily-digest] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log("[daily-digest] No daily digest subscribers");
      return NextResponse.json({
        ok: true,
        message: "No subscribers.",
      });
    }

    let attempted = 0;
    let sent = 0;

    // 3) Process each subscriber
    for (const profile of profiles) {
      const email = profile.email;
      if (!email) continue;

      attempted++;

      // Build a minimal text body for the template
      const plainBody = `
Daily Productivity Digest
--------------------------
Example score: 70/100
Example wins: Focus session, inbox zero, planning
Focus: Deep work 9–11am
      `.trim();

      // 4) Get branded HTML + text
      const { text, html } = renderDailyDigestEmail(plainBody);

      // 5) Send email
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Your Daily AI Productivity Digest",
          text,
          html,
          headers: {
            "List-Unsubscribe": "<https://aiprod.app/settings>",
          },
        });

        sent++;
      } catch (sendErr) {
        console.error("[daily-digest] Error sending to:", email, sendErr);
      }

      // Throttle to avoid 429 (Resend max 2 req/sec)
      await new Promise((res) => setTimeout(res, 600));
    }

    return NextResponse.json({
      ok: true,
      attempted,
      sent,
      totalSubscribers: profiles.length,
    });
  } catch (err: any) {
    console.error("[daily-digest] Fatal error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
