import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

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

/* ---------------- AI USAGE (ai_usage table) ---------------- */

async function checkAndIncrementAiUsage(userId: string) {
  const today = getTodayString();

  // plan
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    // don’t block AI if profile fetch fails; default to free
    console.error("[daily-plan] profile plan load error", profileErr);
  }

  const planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
  const isPro = planRaw === "pro" || planRaw === "founder";
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // usage row
  const { data: usage, error: usageErr } = await supabaseAdmin
    .from("ai_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageErr && (usageErr as any).code !== "PGRST116") {
    throw new Error("Could not check AI usage.");
  }

  const current = usage?.count || 0;

  // block only for free
  if (!isPro && current >= dailyLimit) {
    const err = new Error("Daily AI limit reached.");
    (err as any).status = 429;
    (err as any).plan = planRaw;
    (err as any).dailyLimit = dailyLimit;
    (err as any).usedToday = current;
    throw err;
  }

  // increment
  if (!usage) {
    const { error: insErr } = await supabaseAdmin
      .from("ai_usage")
      .insert([{ user_id: userId, usage_date: today, count: 1 }]);

    if (insErr) throw new Error("Failed to update AI usage.");
    return { plan: planRaw, dailyLimit, usedToday: 1 };
  } else {
    const next = current + 1;
    const { error: updErr } = await supabaseAdmin
      .from("ai_usage")
      .update({ count: next })
      .eq("id", usage.id);

    if (updErr) throw new Error("Failed to update AI usage.");
    return { plan: planRaw, dailyLimit, usedToday: next };
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

    /* 1️⃣ PROFILE (tone, focus, language) */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("ai_tone, focus_area, ui_language")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[daily-plan] profile load error", profileError);
    }

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area ?? null;

    const uiLang = normalizeLang(profile?.ui_language);
    const langName = getLanguageName(uiLang);

    /* 2️⃣ TASKS */
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("title, description, due_date, completed")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(30);

    if (tasksErr) {
      console.error("[daily-plan] tasks load error", tasksErr);
    }

    const openTasks = (tasks || []).filter((t: any) => !t.completed);

    const tasksText = openTasks
      .map((t: any, i: number) => {
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

    /* 3️⃣ SYSTEM PROMPT (STRICT LANGUAGE) */
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
`.trim();

    /* 4️⃣ CALL OPENAI */
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

    const planText = completion.choices[0]?.message?.content?.trim() || null;
    if (!planText) throw new Error("Empty AI response");

    /* 5️⃣ UPDATE USAGE (counts 1 AI call) */
    const usageMeta = await checkAndIncrementAiUsage(userId);

    return NextResponse.json({
      plan: planText,
      usedToday: usageMeta.usedToday,
      dailyLimit: usageMeta.dailyLimit,
      planAccount: usageMeta.plan,
    });
  } catch (err: any) {
    // limit hit
    if (err?.status === 429) {
      return NextResponse.json(
        {
          error: err?.message || "Daily AI limit reached.",
          plan: err?.plan || "free",
          dailyLimit: err?.dailyLimit || FREE_DAILY_LIMIT,
          usedToday: err?.usedToday || 0,
        },
        { status: 429 }
      );
    }

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
