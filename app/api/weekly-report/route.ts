// app/api/weekly-report/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to get YYYY-MM-DD
function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
}

async function getWeeklySummary(userId: string) {
  const today = new Date();
  const past = new Date();
  past.setDate(past.getDate() - 7);
  const pastStr = toDateString(past);

  // 1) Productivity scores (daily_scores)
  const { data: scores, error: scoresError } = await supabaseAdmin
    .from("daily_scores")
    .select("score_date, score")
    .eq("user_id", userId)
    .gte("score_date", pastStr);

  if (scoresError) {
    console.error("weekly-report: scores error", scoresError);
  }

  const validScores = scores || [];
  const avgScore =
    validScores.length > 0
      ? Math.round(
          validScores.reduce(
            (sum: number, r: any) => sum + (r.score || 0),
            0
          ) / validScores.length
        )
      : null;

  // 2) Notes in last 7 days
  const { count: noteCount, error: notesError } = await supabaseAdmin
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", pastStr);

  if (notesError) {
    console.error("weekly-report: notes error", notesError);
  }

  // 3) Tasks in last 7 days
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("title, completed, created_at")
    .eq("user_id", userId)
    .gte("created_at", pastStr);

  if (tasksError) {
    console.error("weekly-report: tasks error", tasksError);
  }

  const taskList = tasks || [];
  const completedTasks = taskList.filter((t) => t.completed).length;

  // 4) Current streak (from all scores)
  const { data: allScores, error: allScoresError } = await supabaseAdmin
    .from("daily_scores")
    .select("score_date, score")
    .eq("user_id", userId)
    .order("score_date", { ascending: true });

  if (allScoresError) {
    console.error("weekly-report: streak error", allScoresError);
  }

  let streak = 0;
  if (allScores && allScores.length > 0) {
    const goodSet = new Set(
      allScores
        .filter((r: any) => r.score >= 60)
        .map((r: any) => r.score_date)
    );

    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const dStr = toDateString(d);
      if (goodSet.has(dStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    avgScore,
    noteCount: noteCount || 0,
    completedTasks,
    streak,
    tasks: taskList,
  };
}

export async function GET() {
  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
  .from("profiles")
  .select("id, email, plan, weekly_report_enabled");

    if (profilesError) {
      console.error("weekly-report: profiles error", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aiprod.app";

    for (const user of profiles || []) {
  if (!user.email) continue;

  const plan = (user as any).plan || "free";
  const weeklyEnabled = (user as any).weekly_report_enabled;

  // Only Pro users can get weekly reports
  if (plan !== "pro") continue;

  // Respect user toggle (if false, skip)
  if (weeklyEnabled === false) continue;

  const weekly = await getWeeklySummary(user.id);

      // Skip users with no meaningful activity
      if (
        weekly.avgScore === null &&
        weekly.completedTasks === 0 &&
        weekly.noteCount === 0
      ) {
        continue;
      }

      // 2) Ask OpenAI for insights
      const prompt = `
User Weekly Productivity Report

Average score (past 7 days): ${weekly.avgScore ?? "N/A"}
Completed tasks (past 7 days): ${weekly.completedTasks}
Notes added (past 7 days): ${weekly.noteCount}
Current streak (score ≥ 60): ${weekly.streak} days

Tasks snapshot:
${weekly.tasks
  .slice(0, 10)
  .map(
    (t: any) =>
      `- [${t.completed ? "x" : " "}] ${t.title || "(untitled task)"}`
  )
  .join("\n")}

Write a short report in this structure:

1) One short motivational paragraph (2–4 sentences, friendly, specific).
2) A section "Key wins this week" with 2–4 bullet points.
3) A section "Focus for next week" with 3 bullet points of specific, realistic actions.
4) A one-line "Weekly theme" summarizing the focus for next week.

Keep it concise, practical, and non-cringe.
`;

      const ai = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const finalSummary =
        ai.choices[0].message.content || "No summary generated.";

      // 3) Save report in DB
      try {
        await supabaseAdmin.from("weekly_reports").insert([
          {
            user_id: user.id,
            summary: finalSummary,
            // report_date defaults to current_date
          },
        ]);
      } catch (insertError) {
        console.error("weekly-report: insert error", insertError);
      }

      // 4) Send email using our new sendEmail()
      try {
        await sendEmail({
          to: user.email,
          subject: "Your Weekly AI Productivity Report",
          html: `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #020617; color: #e5e7eb; padding: 24px;">
            <div style="max-width: 640px; margin: 0 auto; background: #020617; border-radius: 16px; border: 1px solid #1e293b; padding: 24px;">
              <h2 style="margin-top: 0; font-size: 20px; color: #e5e7eb;">Your Weekly AI Productivity Report</h2>
              <p style="font-size: 14px; color: #cbd5f5;">
                Here’s a quick overview of your last 7 days using AI Productivity Hub:
              </p>

              <ul style="font-size: 14px; color: #e5e7eb; padding-left: 18px;">
                <li><strong>Average daily score:</strong> ${weekly.avgScore ?? "No data"}</li>
                <li><strong>Completed tasks:</strong> ${weekly.completedTasks}</li>
                <li><strong>Notes added:</strong> ${weekly.noteCount}</li>
                <li><strong>Current streak (score ≥ 60):</strong> ${
                  weekly.streak
                } day${weekly.streak === 1 ? "" : "s"}</li>
              </ul>

              <h3 style="font-size: 16px; margin-top: 20px; color: #e5e7eb;">AI Insights</h3>
              <div style="white-space: pre-wrap; font-size: 14px; color: #e5e7eb; line-height: 1.5; margin-bottom: 16px;">
                ${finalSummary.replace(/\n/g, "<br/>")}
              </div>

              <p style="font-size: 13px; color: #9ca3af; margin-top: 16px;">
                Keep your streak going: open your dashboard to plan today with AI.
              </p>
              <p>
                <a href="${siteUrl}/dashboard" style="display: inline-block; padding: 10px 16px; background: #4f46e5; color: white; text-decoration: none; border-radius: 9999px; font-size: 13px;">
                  Open Dashboard
                </a>
              </p>

              <p style="font-size: 11px; color: #6b7280; margin-top: 24px;">
                You’re receiving this because you have an account on AI Productivity Hub.
              </p>
            </div>
          </div>
        `,
        });
      } catch (emailError) {
        console.error("weekly-report: sendEmail error", emailError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("weekly-report: fatal error", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
