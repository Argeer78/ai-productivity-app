// app/api/daily-digest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderDailyDigestEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

// Small helper if you ever want throttling later
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  // 1) Auth check with CRON_SECRET
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error("[daily-digest] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (authHeader !== expected) {
    console.warn("[daily-digest] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2) Load all subscribed profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, ai_tone, focus_area, daily_digest_enabled")
      .eq("daily_digest_enabled", true)
      .not("email", "is", null);

    if (error) {
      console.error("[daily-digest] profiles query error", error);
      return NextResponse.json(
        { ok: false, error: "DB error loading profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log("[daily-digest] No subscribers found");
      return NextResponse.json({
        ok: true,
        message: "No subscribers for daily digest.",
      });
    }

    let attempted = 0;
    let sent = 0;

    // We'll treat "today" in UTC for now
    const now = new Date();
    const todayDate = now.toISOString().split("T")[0];

    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
    const startOfTomorrowIso = startOfTomorrow.toISOString();

    // 3) Loop over subscribed users and send emails
    for (const profile of profiles) {
      const email = profile.email as string | null;
      if (!email) continue;

      attempted++;

      // --- 3a) Load unfinished tasks for this user (due today + overdue) ---
      const userId = profile.id as string;

      // Tasks due today (not completed)
      const { data: tasksDueToday, error: tasksTodayError } =
        await supabaseAdmin
          .from("tasks")
          .select("id, title, description, due_date, completed")
          .eq("user_id", userId)
          .eq("completed", false)
          .gte("due_date", startOfTodayIso)
          .lt("due_date", startOfTomorrowIso);

      if (tasksTodayError) {
        console.error(
          "[daily-digest] tasksDueToday error for",
          email,
          tasksTodayError
        );
      }

      // Overdue tasks (not completed, due_date before today)
      const { data: overdueTasks, error: overdueError } = await supabaseAdmin
        .from("tasks")
        .select("id, title, description, due_date, completed")
        .eq("user_id", userId)
        .eq("completed", false)
        .lt("due_date", startOfTodayIso);

      if (overdueError) {
        console.error(
          "[daily-digest] overdueTasks error for",
          email,
          overdueError
        );
      }

      const safeTasksDueToday = tasksDueToday || [];
      const safeOverdueTasks = overdueTasks || [];

      // Optional: keep lists short
      const maxPerSection = 10;
      const tasksDueTodayShort = safeTasksDueToday.slice(0, maxPerSection);
      const overdueTasksShort = safeOverdueTasks.slice(0, maxPerSection);

      // --- 3b) Build daily summary text (fullBody) including tasks ---
      const focus = profile.focus_area || "your most important work";
      const tone = profile.ai_tone || "friendly";

      const lines: string[] = [];

      lines.push("Hi there 👋", "");
      lines.push(
        `Here’s your daily AI Productivity Hub digest for ${todayDate}:`,
        ""
      );
      lines.push(`• Tone: ${tone}`);
      lines.push(`• Focus area: ${focus}`);
      lines.push("");

      // Tasks section: due today
      if (tasksDueTodayShort.length > 0) {
        lines.push("Today's tasks (not completed):");
        for (const t of tasksDueTodayShort) {
          const title = (t.title as string | null) || "(untitled task)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || todayDate;
          lines.push(`• ${title} (due ${dueDateStr})`);
        }
        lines.push("");
      }

      // Tasks section: overdue
      if (overdueTasksShort.length > 0) {
        lines.push("Overdue tasks (still open):");
        for (const t of overdueTasksShort) {
          const title = (t.title as string | null) || "(untitled task)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || "unknown date";
          lines.push(`• ${title} (was due ${dueDateStr})`);
        }
        lines.push("");
      }

      if (tasksDueTodayShort.length === 0 && overdueTasksShort.length === 0) {
        lines.push(
          "No tasks due today or overdue. Great moment to plan your next priorities in the Tasks page. ✅",
          ""
        );
      }

      lines.push("Tomorrow, you might try:");
      lines.push("• Planning your top 3 priorities before you start.");
      lines.push(
        "• One deep-work block (60–90 minutes) with no notifications."
      );
      lines.push("• Writing one quick note about what you finished.");
      lines.push("");
      lines.push("You can change your daily digest settings anytime in the app.");

      const fullBody = lines.join("\n");

      // --- 3c) Get branded HTML + text using the shared template ---
      const { text, html } = renderDailyDigestEmail(fullBody);

      // --- 3d) Send email via Resend ---
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Your Daily AI Productivity Digest",
          text,
          html,
          headers: {
            "List-Unsubscribe": "<https://aiprod.app/settings>",
          },
        });

        console.log("[daily-digest] sent to", email);
        sent++;
      } catch (sendErr: any) {
        console.error(
          "[daily-digest] Resend error for",
          email,
          sendErr?.message || sendErr
        );
        // don't throw → continue to next user
      }

      // Optional: throttle slightly if needed
      // await delay(300);
    }

    return NextResponse.json({
      ok: true,
      message: `Daily digest processed for ${profiles.length} profiles, attempted ${attempted}, sent ${sent}.`,
    });
  } catch (err: any) {
    console.error("[daily-digest] handler error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error in daily digest." },
      { status: 500 }
    );
  }
}
