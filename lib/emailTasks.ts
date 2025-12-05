// lib/emailTasks.ts
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

if (!resendApiKey) {
  console.warn(
    "[emailTasks] RESEND_API_KEY is not set – task reminder emails will fail."
  );
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
      : null;

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
    "— AI Productivity Hub"
  );

  const text = plainLines.join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin: 0 0 8px; font-size: 18px;">Task reminder</h2>
      <p style="margin: 0 0 12px;">This is a quick reminder from <strong>AI Productivity Hub</strong>:</p>
      <ul style="margin: 0 0 12px; padding-left: 18px;">
        <li><strong>Task:</strong> ${escapeHtml(taskTitle)}</li>
        ${
          humanDue
            ? `<li><strong>When:</strong> ${escapeHtml(humanDue)}</li>`
            : ""
        }
      </ul>
      ${
        taskNote
          ? `<p style="margin: 0 0 12px;"><strong>Notes:</strong><br />${escapeHtml(
              taskNote
            ).replace(/\n/g, "<br />")}</p>`
          : ""
      }
      <p style="margin: 0 0 12px;">
        <a href="https://aiprod.app/tasks" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#6366f1;color:#f9fafb;text-decoration:none;font-size:13px;">
          Open my tasks
        </a>
      </p>
      <p style="margin: 12px 0 0; font-size: 12px; color: #64748b;">
        You can turn off task reminders from Settings at any time.
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

    // Resend returns { data: { id: string } | null, error?: ... }
    console.log(
      "[emailTasks] Task reminder email sent:",
      result?.data?.id || result
    );
  } catch (err) {
    console.error("[emailTasks] Failed to send task reminder email:", err);
  }
}

// small helper to avoid XSS in HTML email
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
