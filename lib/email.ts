// lib/email.ts
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";

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

function getFromAddress() {
  const envFrom = process.env.RESEND_FROM_EMAIL;
  if (!envFrom) {
    // Fallback – Resend sandbox
    return "AI Productivity Hub <onboarding@resend.dev>";
  }

  // If user already put a full "Name <email@domain>" keep it
  if (envFrom.includes("<") && envFrom.includes(">")) {
    return envFrom;
  }

  // Otherwise wrap it nicely
  return `AI Productivity Hub <${envFrom}>`;
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
 * Test email helper – used by the Settings "Send test email" button.
 * Also defensive: never throws, just returns boolean.
 */
export async function sendTestEmail(email: string): Promise<boolean> {
  if (!email) {
    console.warn("[test-email] Missing email");
    return false;
  }

  if (!resend) {
    console.warn(
      "[test-email] Resend client not initialized, skipping send to",
      email
    );
    return false;
  }

  try {
    const subject = "AI Productivity Hub – test email";

    const text = [
      "Hi 👋",
      "",
      "This is a test email from AI Productivity Hub.",
      "",
      "If you are reading this, your email sending configuration is working.",
      "",
      "You can disable daily digests from Settings inside the app.",
      "",
      "— AI Productivity Hub",
    ].join("\n");

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text,
    });

    console.log("[test-email] Email sent to", email);
    return true;
  } catch (err) {
    console.error("[test-email] Resend send error for", email, err);
    return false;
  }
}
