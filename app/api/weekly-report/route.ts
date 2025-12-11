// app/api/weekly-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderWeeklyReportEmail } from "@/lib/emailTemplates";
import { verifyCronAuth } from "@/lib/verifyCron";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

export const runtime = "nodejs";

// Small helper for sleep
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Normalize locale like "el-GR" -> "el"
function normalizeLocale(locale?: string | null): "en" | "el" {
  if (!locale) return "en";
  const lower = locale.toLowerCase();
  if (lower.startsWith("el")) return "el";
  return "en";
}

// Wrapper: handle Resend 429 rate limit with retries
async function sendWithRateLimit(
  args: Parameters<typeof resend.emails.send>[0]
) {
  let attempt = 0;

  while (attempt < 3) {
    try {
      const result = await resend.emails.send(args);
      return result;
    } catch (err: any) {
      const status = err?.statusCode || err?.response?.statusCode;

      if (status === 429) {
        attempt += 1;
        const delayMs = 800 * attempt; // 0.8s, 1.6s, 2.4s
        console.warn(
          `[weekly-report] 429 from Resend, retrying in ${delayMs}ms (attempt ${attempt})`
        );
        await delay(delayMs);
        continue;
      }

      // Any other error → rethrow
      throw err;
    }
  }

  throw new Error("Resend rate limit exceeded after retries");
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

/**
 * Core weekly-report logic.
 * Called both by cron and by the protected GET handler.
 */
export async function runWeeklyReport(): Promise<{
  ok: boolean;
  processed: number;
}> {
  const { startDate, endDate } = getWeekRangeDateStrings();

  // Only pro users with weekly reports enabled
  const { data: users, error: usersError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, plan, weekly_report_enabled, language")
    .eq("weekly_report_enabled", true)
    .eq("plan", "pro");

  if (usersError) {
    console.error("[weekly-report] profiles error:", usersError);
    throw usersError;
  }

  if (!users || users.length === 0) {
    console.log("[weekly-report] No pro users with weekly reports enabled.");
    return { ok: true, processed: 0 };
  }

  for (const u of users) {
    const userId = u.id;
    const email = u.email as string | null;
    const locale = (u as any).language || "en";
    const lang = normalizeLocale(locale);

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
      let scoreTrendLine =
        lang === "el"
          ? "Δεν καταγράφηκαν βαθμολογίες αυτή την εβδομάδα."
          : "No scores recorded this week.";

      if (scoresList.length > 0) {
        const total = scoresList.reduce((sum, s) => sum + (s.score || 0), 0);
        avgScore = Math.round(total / scoresList.length);

        const trendParts = scoresList.map((s) => s.score.toString());
        scoreTrendLine =
          lang === "el"
            ? `Πορεία βαθμολογίας αυτή την εβδομάδα: ${trendParts.join(" → ")}`
            : `Score trend this week: ${trendParts.join(" → ")}`;
      }

      // ----- 5) Weekly goal (if any) -----
      const { data: goalRow, error: goalError } = await supabaseAdmin
        .from("weekly_goals")
        .select("goal_text, completed, week_start")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      let weeklyGoalLine =
        lang === "el"
          ? "Δεν ορίστηκε συγκεκριμένος εβδομαδιαίος στόχος."
          : "No explicit weekly goal was set.";

      if (goalError) {
        console.error("[weekly-report] weekly_goals error:", goalError);
      } else if (goalRow?.goal_text) {
        weeklyGoalLine =
          lang === "el"
            ? `Εβδομαδιαίος στόχος: "${goalRow.goal_text}"${
                goalRow.completed ? " (σημειώθηκε ως ολοκληρωμένος ✅)" : ""
              }`
            : `Weekly goal: "${goalRow.goal_text}"${
                goalRow.completed ? " (marked as completed ✅)" : ""
              }`;
      }

      // ----- Build summary text blocks (localized) -----
      const aiWinsBlock =
        lang === "el"
          ? [
              "Οι AI νίκες σου αυτή την εβδομάδα:",
              `• Εργασίες που ολοκληρώθηκαν: ${tasksCompletedCount}`,
              `• Σημειώσεις που δημιουργήθηκαν: ${notesCount}`,
              `• Κλήσεις AI που χρησιμοποιήθηκαν: ${aiCalls}`,
              `• Εκτιμώμενος χρόνος που εξοικονομήθηκε: ${timeSavedMinutes} λεπτά`,
              `• Μέσος δείκτης παραγωγικότητας: ${
                avgScore !== null ? `${avgScore}/100` : "—/100"
              }`,
              scoreTrendLine,
            ].join("\n")
          : [
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

      let topNotesBlock =
        lang === "el" ? "Κορυφαίες σημειώσεις της εβδομάδας:\n" : "Top notes of the week:\n";

      if (topNotes.length === 0) {
        topNotesBlock +=
          lang === "el"
            ? "• Δεν καταγράφηκαν σημειώσεις αυτή την εβδομάδα. Δοκίμασε την επόμενη να σημειώνεις γρήγορα σκέψεις, ιδέες ή αποφάσεις."
            : "• No notes captured this week. Try jotting down quick thoughts, ideas, or decisions next week.";
      } else {
        topNotes.forEach((n) => {
          const titleOrSnippet =
            n.title ||
            (n.content
              ? n.content.slice(0, 80) +
                (n.content.length > 80 ? "…" : "")
              : lang === "el"
              ? "(σημείωση χωρίς τίτλο)"
              : "(untitled note)");
          topNotesBlock += `• ${titleOrSnippet}\n`;
        });
        topNotesBlock = topNotesBlock.trimEnd();
      }

      // ----- Call OpenAI for reflection + focus (localized instructions) -----
      let reflectionAndFocus =
        lang === "el"
          ? "Εδώ είναι η εβδομαδιαία σου ανασκόπηση και προτάσεις εστίασης."
          : "Here’s your weekly reflection and focus suggestions.";

      try {
        const focusHeading =
          lang === "el"
            ? "Εστίαση για την επόμενη εβδομάδα:"
            : "Focus for next week:";

        const writeInstruction =
          lang === "el"
            ? [
                "Γράψε στα ελληνικά:",
                "1) Μια σύντομη ανασκόπηση 3–4 προτάσεων για την εβδομάδα τους (τι φαίνεται να συμβαίνει, πώς χρησιμοποίησαν το AI και πώς συνδέεται με τον εβδομαδιαίο στόχο τους).",
                `2) Έπειτα μια καθαρή ενότητα με τίτλο: '${focusHeading}' και από κάτω 3 συγκεκριμένες προτάσεις σε bullets.`,
                "",
                "Μόνο απλό κείμενο, χωρίς markdown headings.",
              ].join("\n")
            : [
                "Write in English:",
                "1) A short 3–4 sentence reflection of their week (what seems to be happening, how they used AI, and how it relates to their weekly goal).",
                `2) Then a clear section titled: '${focusHeading}' followed by 3 specific bullet-point suggestions.`,
                "",
                "Plain text only, no markdown headings.",
              ].join("\n");

        const userPrompt = [
          "You are an AI productivity coach.",
          "",
          "The user’s weekly stats:",
          aiWinsBlock,
          "",
          weeklyGoalLine,
          "",
          lang === "el"
            ? "Top notes of the week (μπορεί να είναι στα αγγλικά ή ελληνικά):"
            : "Top notes of the week:",
          topNotes.length
            ? topNotes
                .map((n, idx) => {
                  const label =
                    n.title ||
                    (n.content
                      ? n.content.slice(0, 80) +
                        (n.content.length > 80 ? "…" : "")
                      : lang === "el"
                      ? "(σημείωση χωρίς τίτλο)"
                      : "(untitled note)");
                  return `${idx + 1}. ${label}`;
                })
                .join("\n")
            : lang === "el"
            ? "Δεν υπάρχουν σημειώσεις αυτή την εβδομάδα."
            : "No notes this week.",
          "",
          writeInstruction,
        ].join("\n");

        const systemContent =
          lang === "el"
            ? "You are an encouraging productivity coach. Reply in Greek."
            : "You are an encouraging productivity coach. Reply in English.";

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: systemContent,
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

      // ----- Compose final email text (localized) -----
      const lines: string[] = [];

      if (lang === "el") {
        lines.push("Γεια σου 👋");
        lines.push("");
        lines.push(
          "Να η εβδομαδιαία σου αναφορά από το AI Productivity Hub για τις τελευταίες 7 ημέρες:"
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
          "Μπορείς να δεις τα ζωντανά στατιστικά και το ιστορικό σου στην ενότητα Weekly Reports μέσα στην εφαρμογή."
        );
        lines.push("");
        lines.push("Συνέχισε έτσι — οι μικρές, σταθερές νίκες μαζεύονται. 💪");
      } else {
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
          "You can see your live stats and history in the Weekly Reports section."
        );
        lines.push("");
        lines.push("Keep going — small consistent wins add up. 💪");
      }

      const fullBody = lines.join("\n");

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

      // ----- Use branded template for email content (localized shell) -----
      const { text, html } = renderWeeklyReportEmail(fullBody, locale);

      const subject = lang === "el"
        ? "Η εβδομαδιαία αναφορά παραγωγικότητάς σου"
        : "Your Weekly AI Productivity Report";

      // ----- Send email via Resend with rate-limit handling -----
      try {
        const resendResult = await sendWithRateLimit({
          from: FROM_EMAIL,
          to: email,
          subject,
          text,
          html,
          headers: {
            "List-Unsubscribe": "<https://aiprod.app/settings>",
          },
        });

        console.log("[weekly-report] Resend result for", email, resendResult);
      } catch (sendErr) {
        console.error("[weekly-report] Resend error for", email, sendErr);
      }

      // Small delay so we don’t hammer Resend if there are many users
      await delay(700);
    } catch (perUserErr) {
      console.error(
        "[weekly-report] Error while processing user",
        u.id,
        perUserErr
      );
    }
  }

  return { ok: true, processed: users.length };
}

/**
 * Protected GET handler: verify CRON_SECRET, then run.
 * This is what you can call manually (curl/Postman) or from Vercel cron
 * if you want to hit /api/weekly-report directly.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const result = await runWeeklyReport();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[weekly-report] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
