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
    } as any); 
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
  if (!openai) {
    const lines: string[] = [];
    lines.push("Here’s your simple daily snapshot (fallback mode).");
    lines.push("");

    if (opts.notes.length === 0 && opts.tasks.length === 0) {
      lines.push("No new notes or open tasks found.");
    } else {
      if (opts.notes.length > 0) {
        lines.push("Recent notes (last 24 hours):");
        for (const note of opts.notes.slice(0, 5)) {
          lines.push(`- ${note.title || "(untitled)"}`);
        }
        lines.push("");
      }

      if (opts.tasks.length > 0) {
        lines.push("Open tasks:");
        for (const task of opts.tasks.slice(0, 5)) {
          lines.push(`- ${task.title || "(untitled task)"}`);
        }
        lines.push("");
      }
    }

    lines.push("Tip: Capture something today!");
    return lines.join("\n");
  }

  const notesForModel = opts.notes.map((note) => ({
    title: note.title,
    content: note.content,
  }));

  const tasksForModel = opts.tasks.map((task) => ({
    title: task.title,
    description: task.description,
    due_date: task.due_date,
  }));

  const tone = opts.aiTone || "balanced";
  const focus = opts.focusArea || "general productivity";

  const systemPrompt = `
    You are an AI productivity assistant.
    Tone: ${tone}
    Focus: ${focus}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify({ notes: notesForModel, tasks: tasksForModel }) },
    ],
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || "Here's your digest.";
}

/**
 * REAL daily digest:
 */
export async function sendDailyDigest(
  opts: DailyDigestOptions
): Promise<void> {
  const { userId, email, aiTone, focusArea } = opts;

  if (!email) {
    console.warn("[daily-digest] Missing email for user", userId);
    return;
  }

  try {
    const { notes, tasks } = await fetchUserActivity(userId);
    const aiBody = await buildAiDigestBody({ notes, tasks, aiTone, focusArea });

    const subject = "Your AI Productivity Hub daily digest";

    const lines = [
      "Hi 👋",
      "Here’s your daily snapshot from AI Productivity Hub:",
      aiBody,
      "Adjust tone in settings if needed.",
    ];

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: lines.join("\n"),
    });

    console.log("[daily-digest] Email sent to", email);
  } catch (err) {
    console.error("[daily-digest] Error:", err);
  }
}
