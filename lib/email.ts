// lib/email.ts
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "";

let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[daily-digest] RESEND_API_KEY is not set – emails will be skipped."
  );
}

type DailyDigestOptions = {
  userId: string;
  email: string;
  aiTone?: string | null;
  focusArea?: string | null;
};

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

  if (!fromEmail) {
    console.warn(
      "[daily-digest] RESEND_FROM_EMAIL not set, skipping send to",
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

    const result = await resend.emails.send({
      from: `AI Productivity Hub <${fromEmail}>`,
      to: email,
      subject,
      text: lines.join("\n"),
    });

    console.log("[daily-digest] Email send result:", result);
  } catch (err) {
    console.error("[daily-digest] Resend send error for", email, err);
    // DO NOT rethrow – we don’t want the API route to return 500 because of email
  }
}
