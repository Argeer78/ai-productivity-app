// app/api/daily-plan/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

/* ---------------- DATE (Athens) ---------------- */

function getTodayAthensYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const yyyy = parts.find((p) => p.type === "year")?.value || "0000";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------------- LANGUAGE HELPERS ---------------- */

function normalizeLang(code?: string | null) {
  if (!code) return "en";
  return String(code).split("-")[0].toLowerCase();
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
    case "it":
      return "Italian";
    case "pt":
      return "Portuguese";
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

async function getPlanAndUsage(userId: string, today: string) {
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

  const { data: usage, error: usageErr } = await supabaseAdmin
    .from("ai_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageErr && (usageErr as any).code !== "PGRST116") {
    throw Object.assign(new Error("Could not check AI usage."), { status: 500 });
  }

  const current = usage?.count ?? 0;

  return {
    planAccount: planRaw,
    isPro,
    dailyLimit,
    usageId: usage?.id ?? null,
    currentCount: current,
  };
}

async function incrementUsage(
  userId: string,
  today: string,
  usageId: string | null,
  currentCount: number
) {
  // NOTE: we never fail the request if this write fails
  if (!usageId) {
    const { error: insErr } = await supabaseAdmin
      .from("ai_usage")
      .insert([{ user_id: userId, usage_date: today, count: 1 }]);

    if (insErr) {
      console.error("[daily-plan] usage insert error", insErr);
      return { usedToday: 1, wrote: false as const };
    }
    return { usedToday: 1, wrote: true as const };
  }

  const next = currentCount + 1;
  const { error: updErr } = await supabaseAdmin
    .from("ai_usage")
    .update({ count: next })
    .eq("id", usageId);

  if (updErr) {
    console.error("[daily-plan] usage update error", updErr);
    return { usedToday: next, wrote: false as const };
  }

  return { usedToday: next, wrote: true as const };
}

/* ---------------- ROUTE ---------------- */

type Body = { userId?: string };

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const userId = body?.userId || null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to use the daily planner." },
        { status: 401 }
      );
    }

    const today = getTodayAthensYmd();

    // 0) Check usage BEFORE calling OpenAI
    const usageState = await getPlanAndUsage(userId, today);

    // block only for free
    if (!usageState.isPro && usageState.currentCount >= usageState.dailyLimit) {
      return NextResponse.json(
        {
          ok: false,
          error: "You’ve reached today’s AI limit. Try again tomorrow or upgrade.",
          planAccount: usageState.planAccount,
          dailyLimit: usageState.dailyLimit,
          usedToday: usageState.currentCount,
          usageDate: today,
        },
        { status: 429 }
      );
    }

    /* 1) PROFILE (tone, focus, language) */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("ai_tone, focus_area, ui_language")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[daily-plan] profile load error", profileError);
    }

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area ? String(profile.focus_area) : null;

    const uiLang = normalizeLang(profile?.ui_language);
    const langName = getLanguageName(uiLang);

    /* 2) TASKS */
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("title, description, due_date, completed")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(30);

    if (tasksErr) console.error("[daily-plan] tasks load error", tasksErr);

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

    /* 3) SYSTEM PROMPT (STRICT LANGUAGE) */
    let systemPrompt = `
You are an AI daily planner inside AI Productivity Hub.

Respond ONLY in ${langName}. Never use any other language.
${toneDescription}
`.trim();

    if (focusArea) {
      systemPrompt += `\nThe user's main focus area is "${focusArea}".`;
    }

    systemPrompt += `
Output format (no markdown tables):
- One motivating sentence
- "Today's Top 3" (bullets)
- "Suggested order" with morning / afternoon / evening blocks (bullets)
- 2–3 focus tips (bullets)
`.trim();

    /* 4) CALL OPENAI */
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      max_tokens: 420,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextText },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "Empty AI response." }, { status: 500 });
    }

    /* 5) UPDATE USAGE (counts 1 AI call) */
    const inc = await incrementUsage(userId, today, usageState.usageId, usageState.currentCount);

    // ✅ IMPORTANT:
    // Return "text" for the plan content.
    // Return "planAccount" for subscription plan (so the client doesn't accidentally render it as the plan).
    return NextResponse.json(
      {
        ok: true,
        text,
        usedToday: inc.usedToday,
        dailyLimit: usageState.dailyLimit,
        planAccount: usageState.planAccount,
        usageDate: today,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    console.error("[daily-plan] error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Something went wrong while generating your daily plan.",
      },
      { status }
    );
  }
}
