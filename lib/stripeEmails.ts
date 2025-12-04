// lib/stripeEmails.ts
import { Resend } from "resend";
import { renderSimpleTestEmail } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY!);

export type StripePlan = "pro" | "founder";

export function renderStripeUpgradeThankYouEmail(plan: StripePlan) {
  const prettyPlan = plan === "founder" ? "AI Productivity Hub Pro — Founder" : "AI Productivity Hub Pro";

  const subject = `Thanks for upgrading to ${prettyPlan}!`;

  const message = [
    `Hi there,`,
    ``,
    `Thank you for upgrading to ${prettyPlan}. 🎉`,
    ``,
    `You now have full access to AI Productivity Hub Pro features, including:`,
    `• Smarter AI assistance across notes, tasks, and travel`,
    `• Higher AI limits and faster responses`,
    `• Priority access to new features and improvements`,
    ``,
    plan === "founder"
      ? "As a Founder member, your locked-in price stays with you as long as you keep your subscription active. ❤️"
      : "Your subscription will renew automatically unless you cancel from the billing portal.",
    ``,
    "You can manage your subscription anytime in your Settings → Billing.",
    ``,
    "— The AI Productivity Hub team",
  ].join("\n");

  return renderSimpleTestEmail(message, subject);
}

// ✅ Add this function to actually send the email
export async function sendThankYouForUpgradeEmail(toEmail: string, plan: StripePlan) {
  const { subject, text, html } = renderStripeUpgradeThankYouEmail(plan);

  const from = process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

  return await resend.emails.send({
    from,
    to: toEmail,
    subject,
    text,
    html,
    headers: {
      "List-Unsubscribe": "<https://aiprod.app/settings>",
    },
  });
}
