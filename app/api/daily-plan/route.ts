import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

/* ---------------- LANGUAGE HELPERS ---------------- */

function normalizeLang(code?: string | null) {
  if (!code) return "en";
  // handle el-GR, en-US, etc
  return code.split("-")[0].toLowerCase();
}

function getLanguageName(code: string) {
  switch (code) {
    case "el":
      return "Greek";
    case "fr":
      return "French";
    case "de":
      return "German";
    case "es":
      return "Spanish";
    default:
      return "English";
  }
}

/* ---------------- TONE ---------------- */

function buildToneDescription(aiTone?: string | null) {
  switch (aiTone) {
    case "friendly":
      return "Use a warm, friendly, and encouraging tone.";
    case "direct":
      return "Be concise, straightforward, and to the point. Avoid fluff.";
    case "motivational":
      return "Be energetic and motivational, but still practical.";
    case "casual":
      return "Use a relaxed, casual tone, like chatting with a friend.";
    default:
      return "Use a balanced, clear, and professional but approachable tone.";
  }
}

/* ---------------- ROUTE ---------------- */

export async function POST(req: Request) {
  try {
    const { userId } = (await req.json()) as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to use the daily planner." },
        { status: 401 }
      );
    }

    const today = getTodayString();

    /* 1️⃣ PROFILE */
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area, ui_language")
      .eq("id", userId)
      .maybeSingle();

    const plan = profile?.plan === "pro" ? "pro" : "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area ?? null;

    const uiLang = normalizeLang(profile?.ui_language);
    const langName = getLanguageName(uiLang);

    /* 2️⃣ USAGE */
    const { data: usage } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usage?.count ?? 0;

    if (currentCount >= dailyLimit) {
      return NextResponse.json(
        { error: "Daily AI limit reached." },
        { status: 429 }
      );
    }

    /* 3️⃣ TASKS */
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("title, description, due_date, completed")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(30);

    const openTasks = (tasks || []).filter((t) => !t.completed);

    const tasksText = openTasks
      .map((t, i) => {
        const desc = t.description ? ` – ${t.description}` : "";
        const due = t.due_date ? ` (due: ${t.due_date})` : "";
        return `${i + 1}. ${t.title}${desc}${due}`;
      })
      .join("\n");

    const contextText = `
Today: ${today}

User's open tasks:
${tasksText || "(no open tasks)"}
`.trim();

    /* 4️⃣ SYSTEM PROMPT (STRICT LANGUAGE) */
    let systemPrompt = `
You are an AI daily planner inside AI Productivity Hub.

Respond ONLY in ${langName}.
Never use any other language.

${toneDescription}
`.trim();

    if (focusArea) {
      systemPrompt += `\nThe user's main focus area is "${focusArea}".`;
    }

    systemPrompt += `
Output format:
1) One motivating sentence
2) "Today's Top 3"
3) Suggested order (morning / afternoon / evening)
4) 2–3 focus tips
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      max_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextText },
        { role: "system", content: `Respond ONLY in ${langName}.` },
      ],
    });

    const planText =
      completion.choices[0]?.message?.content?.trim() || null;

    if (!planText) {
      throw new Error("Empty AI response");
    }

    /* 5️⃣ UPDATE USAGE */
    if (!usage) {
      await supabaseAdmin.from("ai_usage").insert([
        { user_id: userId, usage_date: today, count: 1 },
      ]);
    } else {
      await supabaseAdmin
        .from("ai_usage")
        .update({ count: currentCount + 1 })
        .eq("id", usage.id);
    }

    return NextResponse.json({
      plan: planText,
      usedToday: currentCount + 1,
      dailyLimit,
      planAccount: plan,
    });
  } catch (err: any) {
    console.error("[daily-plan] error:", err);

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Something went wrong while generating your daily plan.",
      },
      { status: 500 }
    );
  }
}
