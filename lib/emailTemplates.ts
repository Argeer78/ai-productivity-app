// lib/emailTemplates.ts

const APP_NAME = "AI Productivity Hub";
const APP_URL = "https://aiprod.app";
// Use your PWA icon (or any logo you prefer)
const LOGO_URL = `${APP_URL}/icons/icon-192.png`;

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Base branded layout used by all emails.
 */
function baseTemplate(opts: {
  title: string;
  previewText?: string;
  bodyHtml: string;
  footerText?: string;
}) {
  const { title, previewText, bodyHtml, footerText } = opts;

  const preview = previewText || "AI-powered productivity summary.";
  const footer =
    footerText ||
    "You’re receiving this email because you enabled this notification in AI Productivity Hub settings.";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <title>${APP_NAME}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <!-- Preview text (hidden in body but used by clients) -->
    <style>
      .preview-text {
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        color: transparent;
        height: 0;
        width: 0;
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#020617;">
    <div class="preview-text">${preview}</div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#020617;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#020617;">
            <!-- Header with logo -->
            <tr>
              <td align="left" style="padding:0 24px 16px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-right:12px;">
                      <img src="${LOGO_URL}" alt="${APP_NAME} logo"
                        width="40" height="40"
                        style="display:block;border-radius:12px;" />
                    </td>
                    <td>
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;font-size:16px;font-weight:600;">
                        ${APP_NAME}
                      </div>
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#64748b;font-size:12px;">
                        AI-powered focus, planning & small wins.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="padding:0 24px 24px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  style="background:#020617;border-radius:16px;border:1px solid #1e293b;">
                  <tr>
                    <td style="padding:20px 20px 16px 20px;">
                      <h1 style="margin:0 0 8px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;color:#f9fafb;">
                        ${title}
                      </h1>
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#9ca3af;margin-bottom:16px;">
                        ${preview}
                      </div>

                      ${bodyHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:0 24px 12px 24px;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#6b7280;line-height:1.5;">
                  ${footer}
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#6b7280;margin-top:4px;">
                  Manage notifications in your
                  <a href="${APP_URL}/settings" style="color:#818cf8;text-decoration:none;">AI Productivity Hub settings</a>.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

/**
 * Daily digest (used by cron + admin tester)
 */
export function renderDailyDigestEmail(body: string) {
  const safe = escapeHtml(body);

  const text = body;

  const html = baseTemplate({
    title: "Your Daily AI Productivity Digest",
    previewText: "Today’s focus, small wins and next best actions.",
    bodyHtml: `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5e7eb;line-height:1.6;white-space:pre-wrap;">
${safe}
      </div>
    `,
  });

  return { text, html };
}

/**
 * Weekly report (used by cron + admin tester)
 */
export function renderWeeklyReportEmail(body: string) {
  const safe = escapeHtml(body);

  const text = body;

  const html = baseTemplate({
    title: "Your Weekly AI Productivity Report",
    previewText: "Reflection on your week, plus focus suggestions for next week.",
    bodyHtml: `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5e7eb;line-height:1.6;white-space:pre-wrap;">
${safe}
      </div>
    `,
  });

  return { text, html };
}

/**
 * Simple generic template (for admin “simple test”).
 */
export function renderSimpleTestEmail(message: string) {
  const safe = escapeHtml(message);
  const text = message;

  const html = baseTemplate({
    title: "Test email from AI Productivity Hub",
    previewText: "Deliverability & branding test.",
    bodyHtml: `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5e7eb;line-height:1.6;">
${safe}
      </div>
    `,
  });

  return { text, html };
}
