// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[admin-test-email] getUser error", userError);
    }

    // 🔒 Only allow logged-in admin
    if (!user || !user.email || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { ok: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    const { targetEmail, kind } = (await req.json()) as {
      targetEmail?: string;
      kind?: "simple" | "daily" | "weekly";
    };

    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing targetEmail" },
        { status: 400 }
      );
    }

    const type = kind || "simple";

    let subject = "Test email from AI Productivity Hub";
    let html = `<p>This is a simple test email from <b>AI Productivity Hub</b>.</p>
                <p>If you see this in Inbox, deliverability looks good!</p>`;

    if (type === "daily") {
      subject = "Daily digest – test delivery";
      html = `
        <h2>AI Productivity Hub – Daily Digest (Test)</h2>
        <p>This is a <b>test daily digest</b> to verify email delivery.</p>
        <ul>
          <li>Example score: 70/100</li>
          <li>Example wins: Finished project outline, gym, inbox zero 🎯</li>
          <li>Example focus tomorrow: Deep work 9–11am</li>
        </ul>
        <p>You received this because the admin triggered a test from the dashboard.</p>
      `;
    } else if (type === "weekly") {
      subject = "Weekly productivity report – test delivery";
      html = `
        <h2>AI Productivity Hub – Weekly Report (Test)</h2>
        <p>This is a <b>test weekly report</b> to verify email delivery.</p>
        <ul>
          <li>Avg. score this week: 68/100</li>
          <li>Top themes: Consistent mornings, 3 finished tasks/day</li>
          <li>Suggested focus next week: Protect 3 deep work blocks</li>
        </ul>
        <p>You received this because the admin triggered a test from the dashboard.</p>
      `;
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "AI Hub <digest@send.aiprod.app>";

    await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin-test-email] server error", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
