// lib/stripeEmails.ts
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL; 
// e.g. "AI Productivity Hub <hello@aiprod.app>"

if (!RESEND_API_KEY) {
  console.warn(
    "[stripeEmails] RESEND_API_KEY is not set – transactional emails disabled."
  );
}

let resend: Resend | null = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

type Plan = "pro" | "founder";

export async function sendThankYouForUpgradeEmail(opts: {
  to: string;
  plan: Plan;
}) {
  if (!resend || !RESEND_FROM_EMAIL) {
    console.warn(
      "[stripeEmails] Missing Resend configuration. Email not sent."
    );
    return;
  }

  const { to, plan } = opts;

  const humanPlan =
    plan === "founder"
      ? "AI Productivity Hub Pro — Founder"
      : "AI Productivity Hub Pro";

  const subject =
    plan === "founder"
      ? "🎉 You're now a Founder of AI Productivity Hub!"
      : "🎉 Welcome to AI Productivity Hub Pro!";

  const text = `
Hi there,

Thank you for upgrading to ${humanPlan}! 🙌

You now have full access to:
• Higher AI usage limits  
• All Pro-only templates  
• Priority features  
${
  plan === "founder"
    ? "• Your special Founder price is locked forever as long as your subscription remains active. 💫"
    : ""
}

If you have any questions or suggestions, simply reply to this email.

With gratitude,  
Alex  
AI Productivity Hub  
`.trim();

  await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject,
    text,
  });
}
