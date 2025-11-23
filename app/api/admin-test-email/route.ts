// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_KEY || ""; // must match the header from client

export async function POST(req: Request) {
  try {
    // --- security check ---
    const headerKey = req.headers.get("x-admin-key");

    if (!ADMIN_SECRET) {
      console.error("[admin-test-email] ADMIN key not configured");
      return NextResponse.json(
        { ok: false, error: "Server admin key missing" },
        { status: 500 }
      );
    }

    if (!headerKey || headerKey !== ADMIN_SECRET) {
      console.warn("[admin-test-email] Unauthorized attempt");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { targetEmail, kind } = await req.json();

    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing targetEmail" },
        { status: 400 }
      );
    }

    let subject = "";
    let html = "";

    if (kind === "simple") {
      subject = "Test email from AI Productivity Hub";
      html = `<p>This is a simple deliverability test email from <b>AI Productivity Hub</b>.</p>`;
    } else if (kind === "daily") {
      subject = "Daily Digest • Test Email";
      html = `
        <h2>AI Productivity Hub – Daily Digest (Test)</h2>
        <p>This is a <b>test daily digest</b> to verify email delivery.</p>
        <ul>
          <li>Example score: 70/100</li>
          <li>Example wins: Finished project outline, gym, inbox zero 🎯</li>
          <li>Focus tomorrow: Deep work 9–11am</li>
        </ul>
      `;
    } else if (kind === "weekly") {
      subject = "Weekly Report • Test Email";
      html = `
        <h2>AI Productivity Hub – Weekly Report (Test)</h2>
        <p>This is a <b>test weekly report</b> to verify email delivery.</p>
        <ul>
          <li>Avg. score this week: 68/100</li>
          <li>Top themes: Consistent mornings, 3 finished tasks/day</li>
          <li>Suggested focus: Protect 3 deep work blocks</li>
        </ul>
      `;
    } else {
      subject = "Test email from AI Productivity Hub";
      html = `<p>This is a generic test email.</p>`;
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      html,
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
