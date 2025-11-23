// lib/emailTemplates.ts

type BaseEmailParams = {
  title: string;          // e.g. "Your Weekly AI Report"
  preheader?: string;     // short summary shown in inbox preview
  mainHeading: string;    // big heading inside email
  bodyPlain: string;      // your existing plain text content
  footerNote?: string;    // small note at bottom
};

/**
 * Escapes plain text into HTML-safe text and keeps line breaks.
 */
function plainToHtml(plain: string) {
  const escaped = plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(/\n/g, "<br />");
}

/**
 * Base branded layout used for all transactional emails.
 * Uses your dark / indigo branding and logo.
 */
export function renderBrandedEmail({
  title,
  preheader,
  mainHeading,
  bodyPlain,
  footerNote,
}: BaseEmailParams) {
  const bodyHtml = plainToHtml(bodyPlain);

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>${title}</title>
    ${
      preheader
        ? `<meta name="description" content="${preheader}" />`
        : ""
    }
  </head>
  <body style="margin:0;padding:0;background-color:#020617;">
    <div style="background-color:#020617;padding:24px 0;">
      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
        align="center"
        width="100%"
        style="max-width:640px;margin:0 auto;"
      >
        <tr>
          <td style="padding:0 20px 16px 20px;">
            <!-- Header / logo bar -->
            <table
              role="presentation"
              cellspacing="0"
              cellpadding="0"
              border="0"
              width="100%"
              style="border-radius:16px;background:linear-gradient(135deg,#020617,#0f172a);padding:14px 16px;"
            >
              <tr>
                <td style="vertical-align:middle;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td
                        style="
                          width:32px;
                          height:32px;
                          border-radius:999px;
                          background:#4f46e5;
                          text-align:center;
                          vertical-align:middle;
                          font-size:14px;
                          font-weight:700;
                          color:#0b1120;
                          font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                        "
                      >
                        AI
                      </td>
                      <td style="padding-left:10px;">
                        <div
                          style="
                            font-size:14px;
                            font-weight:600;
                            color:#e5e7eb;
                            font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                          "
                        >
                          AI Productivity Hub
                        </div>
                        <div
                          style="
                            font-size:11px;
                            color:#9ca3af;
                            font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                          "
                        >
                          Your AI workspace for focus & tiny wins
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                  <a
                    href="https://aiprod.app"
                    style="
                      font-size:11px;
                      color:#c7d2fe;
                      text-decoration:none;
                      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    "
                  >
                    Open app →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main card -->
        <tr>
          <td style="padding:0 20px 24px 20px;">
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="
                background:#0b1120;
                border-radius:18px;
                border:1px solid #1f2937;
                padding:20px 18px;
              "
            >
              <tr>
                <td>
                  <h1
                    style="
                      margin:0 0 8px 0;
                      font-size:18px;
                      color:#e5e7eb;
                      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    "
                  >
                    ${mainHeading}
                  </h1>

                  ${
                    preheader
                      ? `<p style="margin:0 0 16px 0;font-size:13px;color:#9ca3af;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      ${preheader}
                    </p>`
                      : ""
                  }

                  <div
                    style="
                      font-size:13px;
                      line-height:1.6;
                      color:#e5e7eb;
                      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    "
                  >
                    ${bodyHtml}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 20px 24px 20px;">
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
            >
              <tr>
                <td
                  style="
                    font-size:11px;
                    color:#6b7280;
                    font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    line-height:1.5;
                  "
                >
                  ${
                    footerNote ||
                    `You receive this email because this notification is enabled
                     in your AI Productivity Hub account. You can adjust your preferences
                     in Settings inside the app.`
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
`.trim();

  return {
    text: bodyPlain,
    html,
  };
}

/**
 * Convenience helpers for specific email types
 */
export function renderWeeklyReportEmail(bodyPlain: string) {
  return renderBrandedEmail({
    title: "Your Weekly AI Productivity Report",
    preheader: "A quick AI-powered summary of your week.",
    mainHeading: "Your Weekly AI Productivity Report",
    bodyPlain,
  });
}

export function renderDailyDigestEmail(bodyPlain: string) {
  return renderBrandedEmail({
    title: "Your Daily AI Productivity Digest",
    preheader: "Yesterday’s tiny wins and today’s focus in one email.",
    mainHeading: "Your Daily AI Productivity Digest",
    bodyPlain,
  });
}
