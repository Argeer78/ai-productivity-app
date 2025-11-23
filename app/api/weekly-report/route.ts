// app/api/weekly-report/route.ts  (or wherever this lives)
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

// ✅ simple helper to avoid Resend rate limit (2 req/sec)
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Last 7 days including today
function getWeekRangeDateStrings() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  return { startDate, endDate };
}

export async function GET() {
  try {
    const { startDate, endDate } = getWeekRangeDateStrings();

    // Pro users who turned on weekly reports
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, weekly_report_enabled")
      .eq("weekly_report_enabled", true)
      .eq("plan", "pro");

    if (usersError) {
      console.error("[weekly-report] profiles error:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("[weekly-report] No pro users with weekly reports enabled.");
      return NextResponse.json({ ok: true, processed: 0 });
    }

    for (const u of users) {
      const userId = u.id;
      const email = u.email;
      if (!email) continue;

      try {
        // ----- 1) Notes this week -----
        const { data: notes, error: notesError } = await supabaseAdmin
          .from("notes")
          .select("id, title, content, created_at")
          .eq("user_id", userId)
          .gte("created_at", `${startDate}T00:00:00Z`)
          .order("created_at", { ascending: false });

        if (notesError) {
          console.error("[weekly-report] notes error:", notesError);
        }

        const notesList =
          (notes || []) as {
            id: string;
            title: string | null;
            content: string | null;
            created_at: string | null;
          }[];

        const notesCount = notesList.length;

        // Top 3 recent notes to highlight
        const topNotes = notesList.slice(0, 3);

        // ----- 2) Tasks completed this week -----
        const { data: completedTasks, error: tasksError } =
          await supabaseAdmin
            .from("tasks")
            .select("id, title, description, created_at")
            .eq("user_id", userId)
            .eq("completed", true)
            .gte("created_at", `${startDate}T00:00:00Z`)
            .order("created_at", { ascending: false });

        if (tasksError) {
          console.error("[weekly-report] tasks error:", tasksError);
        }

        const tasksCompletedCount = (completedTasks || []).length;

        // ----- 3) AI usage this week -----
        const { data: usage, error: usageError } = await supabaseAdmin
          .from("ai_usage")
          .select("usage_date, count")
          .eq("user_id", userId)
          .gte("usage_date", startDate)
          .lte("usage_date", endDate)
          .order("usage_date", { ascending: true });

        if (usageError) {
          console.error("[weekly-report] ai_usage error:", usageError);
        }

        const aiUsageList =
          (usage || []) as { usage_date: string; count: number }[];

        const aiCalls = aiUsageList.reduce(
          (sum, row) => sum + (row.count || 0),
          0
        );

        // simple heuristic: ~3 minutes saved per AI call
        const timeSavedMinutes = aiCalls * 3;

        // ----- 4) daily_scores this week -----
        const { data: scores, error: scoresError } = await supabaseAdmin
          .from("daily_scores")
          .select("score_date, score")
          .eq("user_id", userId)
          .gte("score_date", startDate)
          .lte("score_date", endDate)
          .order("score_date", { ascending: true });

        if (scoresError) {
          console.error("[weekly-report] daily_scores error:", scoresError);
        }

        const scoresList =
          (scores || []) as { score_date: string; score: number }[];

        let avgScore: number | null = null;
        let scoreTrendLine = "No scores recorded this week.";

        if (scoresList.length > 0) {
          const total = scoresList.reduce(
            (sum, s) => sum + (s.score || 0),
            0
          );
          avgScore = Math.round(total / scoresList.length);

          const trendParts = scoresList.map((s) => s.score.toString());
          scoreTrendLine = `Score trend this week: ${trendParts.join(" → ")}`;
        }

        // ----- Build text sections -----
        const aiWinsBlock = [
          "Your AI Wins This Week:",
          `• Tasks completed: ${tasksCompletedCount}`,
          `• Notes created: ${notesCount}`,
          `• AI calls used: ${aiCalls}`,
          `• Estimated time saved: ${timeSavedMinutes} minutes`,
          `• Avg productivity score: ${
            avgScore !== null ? `${avgScore}/100` : "—/100"
          }`,
          scoreTrendLine,
        ].join("\n");

        let topNotesBlock = "Top notes of the week:\n";

        if (topNotes.length === 0) {
          topNotesBlock +=
            "• No notes captured this week. Try jotting down quick thoughts, ideas, or decisions next week.";
        } else {
          topNotes.forEach((n) => {
            const titleOrSnippet =
              n.title ||
              (n.content
                ? n.content.slice(0, 80) +
                  (n.content.length > 80 ? "…" : "")
                : "(untitled note)");
            topNotesBlock += `• ${titleOrSnippet}\n`;
          });
          topNotesBlock = topNotesBlock.trimEnd();
        }

        // ----- 5) Weekly goal (if any) -----
        const { data: goalRow, error: goalError } = await supabaseAdmin
          .from("weekly_goals")
          .select("goal_text, completed, week_start")
          .eq("user_id", userId)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        let weeklyGoalLine = "No explicit weekly goal was set.";
        if (goalError) {
          console.error("[weekly-report] weekly_goals error:", goalError);
        } else if (goalRow?.goal_text) {
          weeklyGoalLine = `Weekly goal: "${goalRow.goal_text}"${
            goalRow.completed ? " (marked as completed ✅)" : ""
          }`;
        }

        // ----- Call OpenAI for reflection + focus -----
        let reflectionAndFocus =
          "Here’s your weekly reflection and focus suggestions.";

        try {
          const userPrompt = [
            "You are an AI productivity coach.",
            "",
            "The user’s weekly stats:",
            aiWinsBlock,
            "",
            weeklyGoalLine,
            "",
            "Top notes of the week:",
            topNotes.length
              ? topNotes
                  .map((n, idx) => {
                    const label = n.title || "(untitled note)";
                    return `${idx + 1}. ${label}`;
                  })
                  .join("\n")
              : "No notes this week.",
            "",
            "Write:",
            "1) A short 3–4 sentence reflection of their week (what seems to be happening, how they used AI, and how it relates to their weekly goal).",
            "2) Then a clear section titled: 'Focus for next week:' followed by 3 specific bullet-point suggestions.",
            "",
            "Plain text only, no markdown headings.",
          ].join("\n");

          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: "You are an encouraging productivity coach.",
              },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 400,
          });

          const content = completion.choices[0]?.message?.content;
          if (content && typeof content === "string") {
            reflectionAndFocus = content.trim();
          }
        } catch (aiErr) {
          console.error("[weekly-report] OpenAI error:", aiErr);
        }

        // ----- Compose final email text -----
        const lines: string[] = [];

        lines.push("Hi there 👋");
        lines.push("");
        lines.push(
          "Here’s your weekly AI Productivity Hub report for the last 7 days:"
        );
        lines.push("");
        lines.push(reflectionAndFocus);
        lines.push("");
        lines.push(weeklyGoalLine);
        lines.push("");
        lines.push(aiWinsBlock);
        lines.push("");
        lines.push(topNotesBlock);
        lines.push("");
        lines.push(
          "You can see your live stats and history in the dashboard and Weekly Reports section."
        );
        lines.push("");
        lines.push("Keep going — small consistent wins add up. 💪");

        const fullBody = lines.join("\n");

        // Save plain text version
        const fullBodyText = fullBody;

        // HTML version (simpler + safer)
const escapedBody = fullBody.replace(/</g, "&lt;");
const fullBodyHtml = `
<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#020617; background:#f1f5f9; padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e2e8f0;">
    <h1 style="font-size:20px;margin:0 0 12px 0;">Your Weekly AI Productivity Summary</h1>
    <p style="font-size:14px;margin:0 0 12px 0;">Here’s your weekly snapshot for the last 7 days in AI Productivity Hub.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />

    <pre style="white-space:pre-wrap;font-size:13px;line-height:1.5;color:#0f172a;margin:0 0 16px 0;">
${escapedBody}
    </pre>

    <p style="font-size:14px;margin:16px 0 8px 0;">
      You can review your weekly stats here:<br/>
      <a href="https://aiprod.app/weekly-reports" style="color:#4f46e5;text-decoration:none;">https://aiprod.app/weekly-reports</a>
    </p>

    <p style="font-size:13px;margin:12px 0 0 0;">
      Keep going — small consistent wins add up. 💪
    </p>
  </div>

  <p style="font-size:11px;color:#64748b;margin:12px auto 0 auto;max-width:600px;">
    You’re receiving this email because weekly reports are enabled in your AI Productivity Hub account.
  </p>
</div>
`.trim();

        // ----- Save to weekly_reports table -----
        const todayStr = new Date().toISOString().split("T")[0];

        const { error: insertError } = await supabaseAdmin
          .from("weekly_reports")
          .insert([
            {
              user_id: userId,
              report_date: todayStr,
              summary: fullBody,
            },
          ]);

        if (insertError) {
          console.error(
            "[weekly-report] weekly_reports insert error:",
            insertError
          );
        }

        // ----- Send email via Resend -----
        try {
          const resendResult = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Your Weekly AI Productivity Report",
            text: fullBodyText,
            html: fullBodyHtml,
            headers: {
              "List-Unsubscribe": "<https://aiprod.app/settings>",
            },
          });

          console.log("[weekly-report] Resend result for", email, resendResult);

          // ✅ throttle to avoid 429 rate_limit_exceeded (2 req/sec)
          await delay(600);
        } catch (sendErr) {
          console.error("[weekly-report] Resend error for", email, sendErr);
          // do not throw so other users continue processing
        }
      } catch (perUserErr) {
        console.error(
          "[weekly-report] Error while processing user",
          u.id,
          perUserErr
        );
      }
    }

    return NextResponse.json({ ok: true, processed: users.length });
  } catch (err) {
    console.error("[weekly-report] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
