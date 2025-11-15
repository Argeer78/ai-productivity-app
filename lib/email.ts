// lib/email.ts
import { Resend } from "resend";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resendApiKey = process.env.RESEND_API_KEY || "";
const openaiApiKey = process.env.OPENAI_API_KEY || "";

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[email] RESEND_API_KEY is not set – emails will be skipped."
  );
}

let openai: OpenAI | null = null;
if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
} else {
  console.warn(
    "[email] OPENAI_API_KEY is not set – daily digest will use a simple fallback."
  );
}

type DailyDigestOptions = {
  userId: string;
  email: string;
  aiTone?: string | null;
  focusArea?: string | null;
};

type TestEmailOptions = {
  email: string;
  subject?: string;
  body?: string;
};

/**
 * Decide which "from" address to use.
 * - If RESEND_FROM_EMAIL is set → "AI Productivity Hub <that@address>"
 * - Otherwise fallback to a hard-coded assistant@aiprod.app
 */
function getFromAddress() {
  const envFrom = process.env.RESEND_FROM_EMAIL;
  if (!envFrom) {
    return "AI Productivity Hub <assistant@aiprod.app>";
  }
  return `AI Productivity Hub <${envFrom}>`;
}

/**
 * Generic email sender (used by weekly reports, etc.)
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<void> {
  if (!to) {
    console.warn("[sendEmail] Missing 'to' address");
    return;
  }
  if (!resend) {
    console.warn(
      "[sendEmail] Resend client not initialized, skipping send to",
      to
    );
    return;
  }

  // Fallback: if no text is provided but html is, create a rough text version
  let fallbackText = text;
  if (!fallbackText && html) {
    fallbackText = html.replace(/<[^>]+>/g, "");
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
      text: fallbackText,
    } as any); // TS: relax Resend's template typing
    console.log("[sendEmail] Email sent to", to);
  } catch (err) {
    console.error("[sendEmail] Resend error for", to, err);
  }
}

/**
 * Fetch last 24h notes & open tasks for a user.
 */
async function fetchUserActivity(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Notes from last 24h
  const { data: notes, error: notesError } = await supabaseAdmin
    .from("notes")
    .select("id, title, content, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  if (notesError) {
    console.error("[daily-digest] Notes query error:", notesError);
  }

  // Open (not done) tasks – no date filter so AI can see current backlog
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, description, is_done, due_date, created_at")
    .eq("user_id", userId)
    .eq("is_done", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (tasksError) {
    console.error("[daily-digest] Tasks query error:", tasksError);
  }

  return {
    notes: (notes || []) as {
      id: string;
      title: string | null;
      content: string | null;
      created_at: string | null;
    }[],
    tasks: (tasks || []) as {
      id: string;
      title: string | null;
      description: string | null;
      is_done: boolean;
      due_date: string | null;
      created_at: string | null;
    }[],
  };
}

/**
 * Build the AI body text using OpenAI.
 */
async function buildAiDigestBody(opts: {
  notes: any[];
  tasks: any[];
  aiTone?: string | null;
  focusArea?: string | null;
}): Promise<string> {
  const { notes, tasks, aiTone, focusArea } = opts;

  // If no OpenAI, fallback to a very simple text body
  if (!openai) {
    const lines: string[] = [];
    lines.push("Here’s your simple daily snapshot (fallback mode).");
    lines.push("");

    if (notes.length === 0 && tasks.length === 0) {
      lines.push(
        "No new notes or open tasks found. This could be a good moment to jot down what you want to focus on today."
      );
      return lines.join("\n");
    }

    if (notes.length > 0) {
      lines.push("Recent notes (last 24 hours):");
      for (const n of notes.slice(0, 5)) {
        const titleOrSnippet =
          n.title ||
          (n.content
            ? n.content.slice(0, 60) +
              (n.content.length > 60 ? "…" : "")
            : "(untitled)");
        lines.push(`- ${titleOrSnippet}`);
      }
      lines.push("");
    }

    if (tasks.length > 0) {
      lines.push("Open tasks:");
      for (const t of tasks.slice(0, 5)) {
        lines.push(`- ${t.title || "(untitled task)"}`);
      }
      lines.push("");
    }

    lines.push(
      "Tip: You can adjust AI tone and focus area in Settings."
    );
    return lines.join("\n");
  }

  // Prepare compact JSON payload for the model
  const notesForModel = notes.map((n) => ({
    title: n.title,
    content: n.content ? String(n.content).slice(0, 400) : "",
    created_at: n.created_at,
  }));

  const tasksForModel = tasks.map((t) => ({
    title: t.title,
    description: t.description
      ? String(t.description).slice(0, 300)
      : "",
    due_date: t.due_date,
    created_at: t.created_at,
    is_done: t.is_done,
  }));

  const tone = aiTone || "balanced";
  const focus = focusArea || "general productivity";

  const systemPrompt = `
You are an AI productivity coach writing a short daily digest email in a ${tone} tone.

User's main focus area: ${focus}.

You receive the user's last 24 hours of notes and their current open tasks in JSON.
Write:

1) A short 2–3 sentence summary of what they worked on or captured.
2) 3–5 specific, actionable next steps they could take today (start each with "-").
3) A brief, encouraging closing line.

Keep it concise, friendly, and practical.
Return plain text only (no markdown, no headings).
If there is almost no data, gently encourage them to capture something today and suggest 2–3 generic next steps.
`.trim();

  const userPrompt = JSON.stringify({
    notes: notesForModel,
    tasks: tasksForModel,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return "Your daily digest is ready, but the AI response was empty. Please try again tomorrow.";
  }
  return content;
}

/**
 * REAL daily digest:
 * - Fetch notes/tasks from Supabase
 * - Use OpenAI to write a summary + next actions
 * - Send via Resend
 *
 * Very defensive: logs and returns on errors instead of throwing.
 */
export async function sendDailyDigest(
  opts: DailyDigestOptions
): Promise<void> {
  const { userId, email, aiTone, focusArea } = opts;

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
    // 1) Fetch activity
    const { notes, tasks } = await fetchUserActivity(userId);

    // 2) Build AI body (or fallback)
    const aiBody = await buildAiDigestBody({
      notes,
      tasks,
      aiTone,
      focusArea,
    });

    // 3) Build overall email text
    const subject = "Your AI Productivity Hub daily digest";

    const lines: string[] = [
      "Hi there 👋",
      "",
      "Here’s your daily snapshot from AI Productivity Hub:",
      "",
      aiBody,
      "",
      "You can change tone or disable this email from Settings → Daily AI email digest.",
    ];

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: lines.join("\n"),
    } as any);

    console.log("[daily-digest] Email sent to", email);
  } catch (err) {
    console.error(
      "[daily-digest] Resend/OpenAI error for",
      email,
      err
    );
    // Do NOT rethrow – we don’t want the API route to 500 just because sending failed
  }
}

/**
 * Simple email helper used by:
 * - /api/test-email (with default subject/body)
 * - /api/weekly-report (custom weekly report content)
 */
export async function sendTestEmail({
  email,
  subject = "AI Productivity Hub – test email",
  body = [
    "This is a test email from AI Productivity Hub.",
    "",
    "If you're seeing this, your email settings (Resend + domain) are wired correctly.",
  ].join("\n"),
}: TestEmailOptions): Promise<void> {
  if (!email) {
    console.warn("[test-email] Missing email");
    return;
  }
  if (!resend) {
    console.warn(
      "[test-email] Resend client not initialized, skipping send to",
      email
    );
    return;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: body,
    });
    console.log("[test-email] Email sent to", email);
  } catch (err) {
    console.error("[test-email] Resend error for", email, err);
  }
}

