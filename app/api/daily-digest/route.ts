// app/api/daily-digest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderDailyDigestEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

// Small helper if you ever want throttling later
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      .eq("daily_digest_enabled", true)
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

    const todayStr = new Date().toISOString().split("T")[0];

    // 3) Loop over subscribed users and send emails
    for (const profile of profiles) {
      const email = profile.email as string | null;
      if (!email) continue;

      attempted++;

      // --- 3a) Build a simple daily summary text (fullBody) ---
      const focus = profile.focus_area || "your most important work";
      const tone = profile.ai_tone || "friendly";

      const fullBody = [
        "Hi there 👋",
        "",
        `Here’s your daily AI Productivity Hub digest for ${todayStr}:`,
        "",
        `• Tone: ${tone}`,
        `• Focus area: ${focus}`,
        "",
        "Tomorrow, try:",
        "• Planning your top 3 priorities before you start.",
        "• One deep-work block (60–90 minutes) with no notifications.",
        "• Writing one quick note about what you finished.",
        "",
        "You can change your daily digest settings anytime in the app.",
      ].join("\n");

      // --- 3b) Get branded HTML + text using the shared template ---
      const { text, html } = renderDailyDigestEmail(fullBody);

      // --- 3c) Send email via Resend ---
      try {
        const res = await resend.emails.send({
  from: FROM_EMAIL,
  to: email,
  subject: "Your Daily AI Productivity Digest",
  text,
  html,
  headers: {
    "List-Unsubscribe": "<https://aiprod.app/settings>",
  },
});

console.log("[daily-digest] sent to", email);
sent++;

      } catch (sendErr: any) {
        console.error(
          "[daily-digest] Resend error for",
          email,
          sendErr?.message || sendErr
        );
        // don't throw → continue to next user
      }

      // Optional: throttle slightly if needed
      // await delay(300);
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
