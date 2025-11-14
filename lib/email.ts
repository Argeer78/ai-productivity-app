// lib/email.ts
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resendApiKey = process.env.RESEND_API_KEY || "";

let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[email] RESEND_API_KEY is not set – emails will be skipped."
  );
}

function getFromAddress() {
  const envFrom = process.env.RESEND_FROM_EMAIL;
  console.log("[email] RESEND_FROM_EMAIL =", envFrom);

  if (!envFrom) {
    // Fallback – but in your case this *should* be set to assistant@aiprod.app
    return "AI Productivity Hub <assistant@aiprod.app>";
  }

  // Nicely formatted From header
  return `AI Productivity Hub <${envFrom}>`;
}

type DailyDigestOptions = {
  userId: string;
  email: string;
  aiTone?: string | null;
  focusArea?: string | null;
};

type NoteRow = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
};

type TaskRow = {
  id: string;
  title: string | null;
  description: string | null;
  is_done: boolean | null;
  due_date: string | null;
  created_at: string | null;
};

/**
 * Fetch recent notes & tasks for the last 24 hours.
 * Very defensive: logs errors and returns empty arrays on failure.
 */
async function fetchRecentData(userId: string): Promise<{
  notes: NoteRow[];
  tasks: TaskRow[];
}> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24h
  const sinceIso = since.toISOString();

  try {
    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(10);

    if (notesErr) {
      console.error("[daily-digest] notes fetch error:", notesErr);
    }

    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, is_done, due_date, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(10);

    if (tasksErr) {
      console.error("[daily-digest] tasks fetch error:", tasksErr);
    }

    return {
      notes: (notes || []) as NoteRow[],
      tasks: (tasks || []) as TaskRow[],
    };
  } catch (err) {
    console.error("[daily-digest] fetchRecentData error:", err);
    return { notes: [], tasks: [] };
  }
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
    const { notes, tasks } = await fetchRecentData(userId);

    const subject = "Your AI Productivity Hub daily digest";

    const lines: string[] = [];

    lines.push("Hi there 👋");
    lines.push("");
    lines.push("Here’s your daily snapshot from AI Productivity Hub.");
    if (focusArea) lines.push(`Main focus: ${focusArea}`);
    if (aiTone) lines.push(`AI tone preference: ${aiTone}`);
    lines.push("");

    // Notes section
    if (notes.length > 0) {
      lines.push("📝 Notes in the last 24 hours:");
      notes.forEach((n) => {
        const createdAt = n.created_at
          ? new Date(n.created_at).toLocaleString("en-GB", {
              hour12: false,
            })
          : "";
        const titleOrSnippet =
          n.title?.trim() ||
          (n.content ? n.content.slice(0, 60) + "…" : "(empty note)");

        lines.push(`- [${createdAt}] ${titleOrSnippet}`);
      });
      lines.push("");
    } else {
      lines.push("📝 No new notes in the last 24 hours.");
      lines.push("");
    }

    // Tasks section
    if (tasks.length > 0) {
      lines.push("✅ Tasks created/updated in the last 24 hours:");
      tasks.forEach((t) => {
        const createdAt = t.created_at
          ? new Date(t.created_at).toLocaleString("en-GB", {
              hour12: false,
            })
          : "";
        const status = t.is_done ? "[x]" : "[ ]";
        const title = t.title?.trim() || "(untitled task)";
        const due = t.due_date ? ` (due ${t.due_date})` : "";
        lines.push(`- ${status} ${title}${due} – created ${createdAt}`);
      });
      lines.push("");
    } else {
      lines.push("✅ No new tasks in the last 24 hours.");
      lines.push("");
    }

    lines.push(
      "You can adjust or turn off this digest under Settings → Daily AI email digest."
    );
    lines.push("");
    lines.push("— AI Productivity Hub");

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: lines.join("\n"),
    });

    console.log("[daily-digest] Email sent to", email);
  } catch (err) {
    console.error("[daily-digest] Resend send error for", email, err);
    // Do not rethrow – keep cron endpoint stable
  }
}

/**
 * Simple test email used by the Settings "Send test email" button.
 */
export async function sendTestEmail(email: string): Promise<void> {
  if (!email) {
    console.warn("[test-email] No email provided");
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
    const subject = "AI Productivity Hub – test email";

    const lines = [
      "Hi 👋",
      "",
      "This is a test email from AI Productivity Hub.",
      "",
      "If you see this, your email configuration is working.",
      "",
      "— AI Productivity Hub",
    ];

    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      text: lines.join("\n"),
    });

    console.log("[test-email] Test email sent to", email);
  } catch (err) {
    console.error("[test-email] Resend send error for", email, err);
  }
}
