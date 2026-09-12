// app/api/admin-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import {
  renderDailyDigestEmail,
  renderWeeklyReportEmail,
  renderSimpleTestEmail,
} from "@/lib/emailTemplates";
import { renderStripeUpgradeThankYouEmail } from "@/lib/stripeEmails";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const requestSchema = z.object({
  targetEmail: z.email().max(320),
  kind: z.enum(["daily", "weekly", "upgrade-pro", "upgrade-founder", "simple"]).optional(),
}).strict();

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const authError = adminAuthErrorResponse(admin);
    if (authError) return authError;
    if (!admin.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    if (!resend) {
      return NextResponse.json(
        { ok: false, error: "Email is not configured on this environment" },
        { status: 503 }
      );
    }

    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { targetEmail, kind } = parsedBody.data;
    const rateLimit = await enforceProviderRateLimit({ request: req, action: "email:admin-test", rateClass: "admin", verifiedUserId: admin.user.id });
    if (!rateLimit.ok) return rateLimit.response;

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
    } else if (kind === "upgrade-pro" || kind === "upgrade-founder") {
      // 🔔 Stripe upgrade templates (thank-you emails)
      const plan: "pro" | "founder" =
        kind === "upgrade-founder" ? "founder" : "pro";

      const tpl = renderStripeUpgradeThankYouEmail(plan);

      subject =
        plan === "founder"
          ? "Thanks for becoming an AI Productivity Hub Founder ✨"
          : "Thanks for upgrading to AI Productivity Hub Pro ✨";

      text = tpl.text;
      html = tpl.html;
    } else {
      // "simple" or unknown → simple test
      subject = "Test email from AI Productivity Hub";
      const tpl = renderSimpleTestEmail(
        "This is a simple deliverability test email from AI Productivity Hub."
      );
      text = tpl.text;
      html = tpl.html;
    }

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      "AI Productivity Hub <hello@aiprod.app>";

    await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": "<https://aiprod.app/settings>",
      },
    });

    console.log("[admin-test-email] sent");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-test-email] error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
