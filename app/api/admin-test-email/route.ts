// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  renderDailyDigestEmail,
  renderWeeklyReportEmail,
  renderSimpleTestEmail,
} from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_KEY =
  process.env.NEXT_PUBLIC_ADMIN_KEY || process.env.CRON_SECRET || "";

export async function POST(req: Request) {
  try {
    // ✅ Enforce admin key
    if (!ADMIN_KEY) {
      console.error("[admin-test-email] ADMIN_KEY is not configured");
      return NextResponse.json(
        { ok: false, error: "Admin key not configured" },
        { status: 500 }
      );
    }

    const headerKey = req.headers.get("x-admin-key") || "";
    if (headerKey !== ADMIN_KEY) {
      console.warn("[admin-test-email] Unauthorized access");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { targetEmail, kind, plan } = body as {
      targetEmail?: string;
      kind?: "daily" | "weekly" | "simple" | "upgrade-thankyou";
      plan?: "pro" | "founder";
    };

    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing targetEmail" },
        { status: 400 }
      );
    }

    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Missing kind" },
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
    } else if (kind === "upgrade-thankyou") {
      const effectivePlan: "pro" | "founder" = plan === "founder" ? "founder" : "pro";
      const prettyPlan =
        effectivePlan === "founder"
          ? "AI Productivity Hub Pro — Founder"
          : "AI Productivity Hub Pro";

      subject = `Thanks for upgrading to ${prettyPlan}!`;

      const message = [
        `Hi there,`,
        "",
        `Thank you for upgrading to ${prettyPlan}. 🎉`,
        "",
        `You now have full access to AI Productivity Hub Pro features, including:`,
        "• Smarter AI assistance across notes, tasks, and travel",
        "• Higher AI limits and faster responses",
        "• Priority access to new features and improvements",
        "",
        effectivePlan === "founder"
          ? "As a Founder member, your locked-in price stays with you as long as you keep your subscription active. ❤️"
          : "Your subscription will renew automatically unless you cancel from the billing portal.",
        "",
        "You can manage your subscription and update billing details anytime from the Settings → Billing section.",
        "",
        "If you have any questions or feedback, just reply to this email.",
        "",
        "— The AI Productivity Hub team",
      ].join("\n");

      const tpl = renderSimpleTestEmail(message);
      text = tpl.text;
      html = tpl.html;
    } else {
      // "simple" or unknown fallback
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
