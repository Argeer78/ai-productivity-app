// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  renderDailyDigestEmail,
  renderWeeklyReportEmail,
} from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const ADMIN_SECRET = process.env.CRON_SECRET || "";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

export async function POST(req: Request) {
  try {
    // ---- Security: only allow calls with correct Bearer token ----
    const auth = req.headers.get("authorization");
    if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetEmail: string = body?.targetEmail;
    const kind: "simple" | "daily" | "weekly" = body?.kind || "simple";

    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing targetEmail" },
        { status: 400 }
      );
    }

    let subject = "";
    let bodyPlain = "";

    if (kind === "simple") {
      subject = "Test email from AI Productivity Hub";
      bodyPlain = "This is a simple deliverability test email.";
    } else if (kind === "daily") {
      subject = "Daily Digest • Test Email";
      bodyPlain = [
        "AI Productivity Hub – Daily Digest (Test)",
        "",
        "This is a test daily digest to verify email delivery.",
        "",
        "Example stats:",
        "• Example score: 70/100",
        "• Example wins: Finished project outline, gym, inbox zero 🎯",
        "• Focus for tomorrow: Deep work 9–11am",
      ].join("\n");
    } else if (kind === "weekly") {
      subject = "Weekly Report • Test Email";
      bodyPlain = [
        "AI Productivity Hub – Weekly Report (Test)",
        "",
        "This is a test weekly report to verify email delivery.",
        "",
        "Example stats:",
        "• Avg. score this week: 68/100",
        "• Top themes: Consistent mornings, 3 finished tasks/day",
        "• Suggested focus: Protect 3 deep work blocks",
      ].join("\n");
    } else {
      // fallback
      subject = "Test email from AI Productivity Hub";
      bodyPlain = "This is a generic test email.";
    }

    // ---- Use branded templates for daily/weekly; simple stays basic ----
    let text = bodyPlain;
    let html = `<p>${bodyPlain.replace(/\n/g, "<br />")}</p>`;

    if (kind === "daily") {
      ({ text, html } = renderDailyDigestEmail(bodyPlain));
    } else if (kind === "weekly") {
      ({ text, html } = renderWeeklyReportEmail(bodyPlain));
    }

    const sendResult = await resend.emails.send({
      from: FROM_EMAIL,
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
