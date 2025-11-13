// lib/email.ts
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";

// Single shared Resend client (or null if not configured)
let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[email] RESEND_API_KEY is not set – emails will be skipped."
  );
}

type DailyDigestOptions = {
  userId: string;
  email: string;
  aiTone?: string | null;
  focusArea?: string | null;
};

/**
 * Build the "from" address for emails.
 * Uses RESEND_FROM_EMAIL if set, otherwise falls back to assistant@aiprod.app.
 */
function getFromAddress(): string {
  const envFrom = process.env.RESEND_FROM_EMAIL;

  // If ENV already includes a full "Name <email>" string, just return it
  if (envFrom && envFrom.includes("<") && envFrom.includes(">")) {
    return envFrom;
  }

  // If ENV is just an email (assistant@aiprod.app), wrap it
  if (envFrom) {
    return `AI Productivity Hub <${envFrom}>`;
  }

  // Fallback – still a valid sender as long as domain is verified in Resend
  return "AI Productivity Hub <assistant@aiprod.app>";
}

/**
 * VERY DEFENSIVE: this function never throws outwards.
 * If Resend is not configured or sending fails, it just logs and returns.
 */
export async function sendDailyDigest(
  opts: DailyDigestOptions
): Promise<void> {
  const { email, aiTone, focusArea, userId } = opts;

  if (!email) {
    console.warn("[daily-digest] Missing email for user", userId);
    return;
  }

  if (!resend) {
    console.warn(
      "[daily-digest] Resend client not initialized, skipping send to",
      email
    );
    return;
  }

  try {
    const subject = "Your AI Productivity Hub daily digest (prototype)";

    const lines: string[] = [
      "Hi there 👋",
      "",
      "This is your (prototype) daily digest from AI Productivity Hub.",
      focusArea ? `Main focus: ${focusArea}` : "",
      aiTone ? `AI tone preference: ${aiTone}` : "",
      "",
      "Right now this email just confirms that the daily-digest pipeline works.",
      "Later it can include AI-generated summaries of your notes & tasks plus suggested next actions.",
      "",
      "You can disable this email from Settings → Daily AI email digest.",
    ].filter(Boolean);

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: lines.join("\n"),
    });

    console.log("[daily-digest] Email sent to", email);
  } catch (err) {
    console.error("[daily-digest] Resend send error for", email, err);
    // DO NOT rethrow – we don’t want the API route to return 500 because of email
  }
}

/**
 * Simple “test email” helper for the Settings → Test Email button.
 */
export async function sendTestEmail(to: string): Promise<void> {
  if (!to) {
    console.warn("[test-email] Missing 'to' address");
    return;
  }

  if (!resend) {
    console.warn(
      "[test-email] Resend client not initialized, skipping send to",
      to
    );
    return;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: "Test email from AI Productivity Hub",
      text: [
        "Hi 👋",
        "",
        "This is a test email from AI Productivity Hub.",
        "If you’re reading this, your email setup works!",
        "",
        "You can now use daily digests and other email features.",
      ].join("\n"),
    });
    console.log("[test-email] Email sent to", to);
  } catch (err) {
    console.error("[test-email] Resend send error for", to, err);
  }
}
