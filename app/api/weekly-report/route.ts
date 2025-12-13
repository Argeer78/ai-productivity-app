// app/api/weekly-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderWeeklyReportEmail } from "@/lib/emailTemplates";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");

// Make OpenAI optional (don’t crash deploys if key missing)
const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

// Small helper for sleep
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Normalize locale like "el-GR" -> "el", "pt-BR" -> "pt-br"
function normalizeLocale(locale?: string | null): string {
  if (!locale) return "en";
  const lower = locale.trim().toLowerCase();
  if (lower.startsWith("pt-br")) return "pt-br";
  return (lower.split("-")[0] || "en").trim();
}

function languageNameForPrompt(code: string): string {
  const map: Record<string, string> = {
    en: "English",
    el: "Greek",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    "pt-br": "Brazilian Portuguese",
    nl: "Dutch",
    tr: "Turkish",
    ru: "Russian",
    uk: "Ukrainian",
    pl: "Polish",
    ro: "Romanian",
    bg: "Bulgarian",
    sr: "Serbian",
    hr: "Croatian",
    hu: "Hungarian",
    cs: "Czech",
    sk: "Slovak",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    ar: "Arabic",
    he: "Hebrew",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
  };
  return map[code] || code;
}

// AI translate helper (used for non EN/EL)
async function aiTranslate(
  text: string,
  targetLangCode: string
): Promise<string> {
  if (!openai) return text;
  if (!text.trim()) return text;
  if (targetLangCode === "en") return text;

  const langName = languageNameForPrompt(targetLangCode);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `Translate the user's text to ${langName} (${targetLangCode}).\n` +
            `Rules:\n` +
            `- Return ONLY the translated text.\n` +
            `- Preserve bullet points, numbers, emojis, and line breaks.\n` +
            `- Do not add commentary.`,
        },
        { role: "user", content: text },
      ],
    });

    const out = completion.choices?.[0]?.message?.content?.trim();
    return out || text;
  } catch (err) {
    console.error("[weekly-report] aiTranslate error:", err);
    return text;
  }
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

function defaultSubjectEn() {
  return "Your Weekly AI Productivity Report";
}

function defaultSubjectEl() {
  return "Η εβδομαδιαία αναφορά παραγωγικότητάς σου";
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
    // ✅ your schema: ui_language + language
    .select("id, email, plan, weekly_report_enabled, ui_language, language")
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

    // ✅ prefer ui_language, fallback to language
    const rawLocale =
      (u as any).ui_language ||
      (u as any).language ||
      "en";

    const lang = normalizeLocale(rawLocale);

    if (!email) continue;

    try {
      // ----- 1) Notes this week -----
      const { data: notes, error: notesError } = await supabaseAdmin
        .from("notes")
        .select("id, title, content, created_at")
        .eq("user_id", userId)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .order("created_at", { ascending: false });

      if (notesError) console.error("[weekly-report] notes error:", notesError);

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
      const { data: completedTasks, error: tasksError } = await supabaseAdmin
        .from("tasks")
        .select("id, title, description, created_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .order("created_at", { ascending: false });

      if (tasksError) console.error("[weekly-report] tasks error:", tasksError);

      const tasksCompletedCount = (completedTasks || []).length;

      // ----- 3) AI usage this week -----
      const { data: usage, error: usageError } = await supabaseAdmin
        .from("ai_usage")
        .select("usage_date, count")
        .eq("user_id", userId)
        .gte("usage_date", startDate)
        .lte("usage_date", endDate)
        .order("usage_date", { ascending: true });

      if (usageError) console.error("[weekly-report] ai_usage error:", usageError);

      const aiUsageList =
        (usage || []) as { usage_date: string; count: number }[];

      const aiCalls = aiUsageList.reduce((sum, row) => sum + (row.count || 0), 0);
      const timeSavedMinutes = aiCalls * 3;

      // ----- 4) daily_scores this week -----
      const { data: scores, error: scoresError } = await supabaseAdmin
        .from("daily_scores")
        .select("score_date, score")
        .eq("user_id", userId)
        .gte("score_date", startDate)
        .lte("score_date", endDate)
        .order("score_date", { ascending: true });

      if (scoresError) console.error("[weekly-report] daily_scores error:", scoresError);

      const scoresList =
        (scores || []) as { score_date: string; score: number }[];

      let avgScore: number | null = null;
      let scoreTrendLineEn = "No scores recorded this week.";

      if (scoresList.length > 0) {
        const total = scoresList.reduce((sum, s) => sum + (s.score || 0), 0);
        avgScore = Math.round(total / scoresList.length);

        const trendParts = scoresList.map((s) => s.score.toString());
        scoreTrendLineEn = `Score trend this week: ${trendParts.join(" → ")}`;
      }

      // ----- 5) Weekly goal (if any) -----
      const { data: goalRow, error: goalError } = await supabaseAdmin
        .from("weekly_goals")
        .select("goal_text, completed, week_start")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalError) console.error("[weekly-report] weekly_goals error:", goalError);

      let weeklyGoalLineEn = "No explicit weekly goal was set.";

      if (goalRow?.goal_text) {
        weeklyGoalLineEn =
          `Weekly goal: "${goalRow.goal_text}"` +
          (goalRow.completed ? " (marked as completed ✅)" : "");
      }

      // ----- Build blocks (EN base) -----
      const aiWinsBlockEn = [
        "Your AI Wins This Week:",
        `• Tasks completed: ${tasksCompletedCount}`,
        `• Notes created: ${notesCount}`,
        `• AI calls used: ${aiCalls}`,
        `• Estimated time saved: ${timeSavedMinutes} minutes`,
        `• Avg productivity score: ${
          avgScore !== null ? `${avgScore}/100` : "—/100"
        }`,
        scoreTrendLineEn,
      ].join("\n");

      let topNotesBlockEn = "Top notes of the week:\n";
      if (topNotes.length === 0) {
        topNotesBlockEn +=
          "• No notes captured this week. Try jotting down quick thoughts, ideas, or decisions next week.";
      } else {
        for (const n of topNotes) {
          const titleOrSnippet =
            n.title ||
            (n.content
              ? n.content.slice(0, 80) + (n.content.length > 80 ? "…" : "")
              : "(untitled note)");
          topNotesBlockEn += `• ${titleOrSnippet}\n`;
        }
        topNotesBlockEn = topNotesBlockEn.trimEnd();
      }

      // ----- OpenAI reflection (EN base) -----
      let reflectionAndFocusEn =
        "Here’s your weekly reflection and focus suggestions.";

      if (openai) {
        try {
          const focusHeading = "Focus for next week:";

          const writeInstruction = [
            "Write in English:",
            "1) A short 3–4 sentence reflection of their week (what seems to be happening, how they used AI, and how it relates to their weekly goal).",
            `2) Then a clear section titled: '${focusHeading}' followed by 3 specific bullet-point suggestions.`,
            "",
            "Plain text only, no markdown headings.",
          ].join("\n");

          const topNotesForPrompt =
            topNotes.length
              ? topNotes
                  .map((n, idx) => {
                    const label =
                      n.title ||
                      (n.content
                        ? n.content.slice(0, 80) +
                          (n.content.length > 80 ? "…" : "")
                        : "(untitled)");
                    return `${idx + 1}. ${label}`;
                  })
                  .join("\n")
              : "No notes this week.";

          const userPrompt = [
            "You are an AI productivity coach.",
            "",
            "The user’s weekly stats:",
            aiWinsBlockEn,
            "",
            weeklyGoalLineEn,
            "",
            "Top notes of the week:",
            topNotesForPrompt,
            "",
            writeInstruction,
          ].join("\n");

          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: "You are an encouraging productivity coach. Reply in English." },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 400,
          });

          const content = completion.choices?.[0]?.message?.content;
          if (content && typeof content === "string") {
            reflectionAndFocusEn = content.trim();
          }
        } catch (aiErr) {
          console.error("[weekly-report] OpenAI reflection error:", aiErr);
        }
      }

      // ----- Compose EN email first -----
      const linesEn: string[] = [];
      linesEn.push("Hi there 👋", "");
      linesEn.push(
        "Here’s your weekly AI Productivity Hub report for the last 7 days:",
        ""
      );
      linesEn.push(reflectionAndFocusEn, "");
      linesEn.push(weeklyGoalLineEn, "");
      linesEn.push(aiWinsBlockEn, "");
      linesEn.push(topNotesBlockEn, "");
      linesEn.push(
        "You can see your live stats and history in the Weekly Reports section.",
        ""
      );
      linesEn.push("Keep going — small consistent wins add up. 💪");

      let fullBody = linesEn.join("\n");

      // ----- If EL: use manual Greek (optional) OR translate EN -> EL -----
      // You already had a handcrafted Greek version previously.
      // If you prefer the handcrafted one, keep it separately.
      if (lang === "el") {
        // Keep your previous handcrafted EL subject/body if you want,
        // but simplest: translate the EN email to EL:
        fullBody = await aiTranslate(fullBody, "el");
      } else if (lang !== "en") {
        // Any other language: translate once (no double translation)
        fullBody = await aiTranslate(fullBody, lang);
      }

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
        console.error("[weekly-report] weekly_reports insert error:", insertError);
      }

      // ----- Branded template wrapper (pass raw locale) -----
      const { text, html } = renderWeeklyReportEmail(fullBody, rawLocale);

      // ----- Subject -----
      let subject =
        lang === "el" ? defaultSubjectEl() : defaultSubjectEn();

      if (lang !== "en" && lang !== "el") {
        subject = await aiTranslate(defaultSubjectEn(), lang);
      }

      // ----- Send -----
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

        console.log("[weekly-report] sent to", email, "lang=", lang, resendResult);
      } catch (sendErr) {
        console.error("[weekly-report] Resend error for", email, sendErr);
      }

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
