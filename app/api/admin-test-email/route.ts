// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export async function POST(req: Request) {
  try {
    // --- Basic admin key guard (no cookies) ---
    const incomingKey = req.headers.get("x-admin-key") || "";
    if (!ADMIN_KEY || incomingKey !== ADMIN_KEY) {
      console.warn("[admin-test-email] Invalid admin key");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { targetEmail, kind, fromUserEmail } = await req.json();

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
      html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:16px;">
          <h2 style="margin-top:0;">AI Productivity Hub – Simple Test</h2>
          <p>This is a simple deliverability test email from <b>AI Productivity Hub</b>.</p>
          ${
            fromUserEmail
              ? `<p style="font-size:12px;color:#64748b;">Triggered by admin: ${fromUserEmail}</p>`
              : ""
          }
        </div>
      `;
    } else if (kind === "daily") {
      subject = "Daily Digest • Test Email";
      html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:16px;">
          <h2 style="margin-top:0;">AI Productivity Hub – Daily Digest (Test)</h2>
          <p>This is a <b>test daily digest</b> to verify email delivery.</p>
          <ul>
            <li>Example score: 70/100</li>
            <li>Example wins: Finished project outline, gym, inbox zero 🎯</li>
            <li>Focus tomorrow: Deep work 9–11am</li>
          </ul>
          ${
            fromUserEmail
              ? `<p style="font-size:12px;color:#64748b;">Triggered by admin: ${fromUserEmail}</p>`
              : ""
          }
        </div>
      `;
    } else if (kind === "weekly") {
      subject = "Weekly Report • Test Email";
      html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:16px;">
          <h2 style="margin-top:0;">AI Productivity Hub – Weekly Report (Test)</h2>
          <p>This is a <b>test weekly report</b> to verify email delivery.</p>
          <ul>
            <li>Avg. score this week: 68/100</li>
            <li>Top themes: Consistent mornings, 3 finished tasks/day</li>
            <li>Suggested focus: Protect 3 deep work blocks</li>
          </ul>
          ${
            fromUserEmail
              ? `<p style="font-size:12px;color:#64748b;">Triggered by admin: ${fromUserEmail}</p>`
              : ""
          }
        </div>
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
