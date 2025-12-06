import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

if (!resendApiKey || !FROM) {
  console.warn("[emailTasks] Missing API key or FROM email, task reminder emails may fail.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendTaskReminderEmailParams = {
  to: string;
  taskTitle: string;
  taskNote?: string | null;
  dueAt?: string | null; // ISO string (optional)
};

export async function sendTaskReminderEmail({
  to,
  taskTitle,
  taskNote,
  dueAt,
}: SendTaskReminderEmailParams): Promise<void> {
  if (!resend) {
    console.error("[emailTasks] Resend is not configured, skipping email send.");
    return;
  }

  const subject = `Task reminder: ${taskTitle}`;

  const humanDue =
    dueAt && !Number.isNaN(Date.parse(dueAt))
      ? new Date(dueAt).toLocaleString()
      : "No due date set";  // Default if due date is invalid

  const plainLines: string[] = [
    "Hey,",
    "",
    "This is a quick reminder from AI Productivity Hub:",
    "",
    `• Task: ${taskTitle}`,
  ];

  if (humanDue) {
    plainLines.push(`• When: ${humanDue}`);
  }
  if (taskNote) {
    plainLines.push("", "Notes:", taskNote);
  }

  plainLines.push(
    "",
    "Open your tasks to mark it done or reschedule:",
    "https://aiprod.app/tasks",
    "",
    "— AI Productivity Hub",
    "If you no longer wish to receive task reminders, visit https://aiprod.app/settings/unsubscribe"
  );

  const text = plainLines.join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.5;">
      <h2>Task reminder</h2>
      <p>This is a quick reminder from <strong>AI Productivity Hub</strong>:</p>
      <ul>
        <li><strong>Task:</strong> ${escapeHtml(taskTitle)}</li>
        ${humanDue ? `<li><strong>When:</strong> ${escapeHtml(humanDue)}</li>` : ""}
      </ul>
      ${taskNote ? `<p><strong>Notes:</strong><br />${escapeHtml(taskNote).replace(/\n/g, "<br />")}</p>` : ""}
      <p>
        <a href="https://aiprod.app/tasks" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#6366f1;color:#f9fafb;text-decoration:none;font-size:13px;">
          Open my tasks
        </a>
      </p>
      <p style="font-size: 12px; color: #64748b;">
        If you no longer wish to receive task reminders, visit <a href="https://aiprod.app/settings/unsubscribe">this link</a>.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": "<https://aiprod.app/settings>",
      },
    });

    console.log("[emailTasks] Task reminder email sent:", result?.data?.id || result);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[emailTasks] Failed to send task reminder email:", err.message);
    } else {
      console.error("[emailTasks] Unexpected error:", err);
    }
  }
}

// Escape HTML to prevent XSS in email content
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
