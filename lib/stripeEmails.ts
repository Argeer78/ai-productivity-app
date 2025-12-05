// lib/stripeEmails.ts
import { renderSimpleTestEmail } from "@/lib/emailTemplates";
import { Resend } from "resend";

type UpgradePlan = "pro" | "founder";

/**
 * Build the thank-you email content when a user upgrades.
 * Returns subject + text + html, so it can be reused by:
 *  - the Stripe webhook
 *  - the admin test email route
 */
export function renderStripeUpgradeThankYouEmail(plan: UpgradePlan) {
  const isFounder = plan === "founder";

  const subject = isFounder
    ? "Welcome to AI Productivity Hub – Founder lifetime plan 🎉"
    : "Thanks for upgrading to AI Productivity Hub Pro 🎉";

  const messageLines: string[] = [
    isFounder
      ? "Thank you for becoming a Founder of AI Productivity Hub! 💫"
      : "Thank you for upgrading to AI Productivity Hub Pro! 🚀",
    "",
    "Your account has just been upgraded. Here’s what you can do next:",
    "- Open the AI Hub to run deep work sessions, planning prompts, and daily check-ins.",
    "- Use the Templates page to quickly reuse your favorite prompts.",
    "- Turn on daily or weekly emails from Settings, if you want summaries in your inbox.",
    "",
    isFounder
      ? "As a Founder, your special pricing is locked in for as long as you keep your subscription active."
      : "Your subscription will renew automatically unless you cancel from the billing portal.",
    "",
    "If you have any questions or feedback, just reply to this email.",
    "",
    "— AI Productivity Hub",
  ];

  const message = messageLines.join("\n");

  // ✅ renderSimpleTestEmail only takes the message
  const base = renderSimpleTestEmail(message);

  return {
    subject,
    text: base.text,
    html: base.html,
  };
}

/**
 * Actually send the thank-you email via Resend.
 * Used by the Stripe webhook.
 */
export async function sendThankYouForUpgradeEmail(
  to: string,
  plan: UpgradePlan
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[stripeEmails] RESEND_API_KEY is missing, skipping email");
    return;
  }

  const resend = new Resend(apiKey);
  const tpl = renderStripeUpgradeThankYouEmail(plan);

  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      headers: {
        "List-Unsubscribe": "<https://aiprod.app/settings>",
      },
    });

    console.log("[stripeEmails] Thank-you email sent:", result);
  } catch (err) {
    console.error("[stripeEmails] Failed to send thank-you email:", err);
  }
}
