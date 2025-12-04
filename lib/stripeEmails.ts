// lib/stripeEmails.ts
import { renderSimpleTestEmail } from "./emailTemplates";

export type StripePlan = "pro" | "founder";

type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Thank-you email when someone upgrades via Stripe (Pro / Founder).
 */
export function renderStripeUpgradeThankYouEmail(plan: StripePlan): RenderedEmail {
  const prettyPlan =
    plan === "founder"
      ? "AI Productivity Hub Pro — Founder"
      : "AI Productivity Hub Pro";

  const subject = `Thanks for upgrading to ${prettyPlan}!`;

  const message = [
    "Hi there,",
    "",
    `Thank you for upgrading to ${prettyPlan}. 🎉`,
    "",
    "You now have full access to AI Productivity Hub Pro features, including:",
    "• Smarter AI assistance across notes, tasks, and travel",
    "• Higher AI limits and faster responses",
    "• Priority access to new features and improvements",
    "",
    plan === "founder"
      ? "As a Founder member, your locked-in price stays with you as long as you keep your subscription active. ❤️"
      : "Your subscription will renew automatically unless you cancel from the billing portal.",
    "",
    "You can manage your subscription and update billing details anytime from the Settings → Billing section.",
    "",
    "If you have any questions or feedback, just reply to this email.",
    "",
    "— The AI Productivity Hub team",
  ].join("\n");

  const base = renderSimpleTestEmail(message);

  return {
    subject,
    text: base.text,
    html: base.html,
  };
}
