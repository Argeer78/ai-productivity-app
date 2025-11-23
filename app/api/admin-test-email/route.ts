// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  renderDailyDigestEmail,
  renderWeeklyReportEmail,
  renderSimpleTestEmail,
} from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_SECRET = process.env.CRON_SECRET || ""; // or a dedicated ADMIN_KEY if you prefer

export async function POST(req: Request) {
  try {
    // optional: protect with CRON_SECRET or NEXT_PUBLIC_ADMIN_KEY via header
    // const auth = req.headers.get("x-admin-key");
    // if (!auth || auth !== process.env.NEXT_PUBLIC_ADMIN_KEY) { ... }

    const { targetEmail, kind } = await req.json();

    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing targetEmail" },
        { status: 400 }
      );
    }

    let subject = "";
    let text = "";
    let html = "";

    if (kind === "daily") {
      subject = "Daily Digest • Test Email";
      const tpl = renderDailyDigestEmail(
        "This is a test daily digest from AI Productivity Hub.\n\nExample:\n• Score: 72/100\n• 3 key wins\n• Focus suggestion for tomorrow."
      );
      text = tpl.text;
      html = tpl.html;
    } else if (kind === "weekly") {
      subject = "Weekly Report • Test Email";
      const tpl = renderWeeklyReportEmail(
        "This is a test weekly report from AI Productivity Hub.\n\nExample:\n• Avg. score: 68/100\n• 12 tasks completed\n• Reflection + focus suggestions for next week."
      );
      text = tpl.text;
      html = tpl.html;
    } else {
      subject = "Test email from AI Productivity Hub";
      const tpl = renderSimpleTestEmail(
        "This is a simple deliverability test email from AI Productivity Hub."
      );
      text = tpl.text;
      html = tpl.html;
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": "<https://aiprod.app/settings>",
      },
    });

    console.log("[admin-test-email] sendResult:", sendResult);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-test-email] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
