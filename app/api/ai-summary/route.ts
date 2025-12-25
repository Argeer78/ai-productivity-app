import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiLanguageInstruction } from "@/lib/aiLanguage";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

// ✅ Athens-consistent YYYY-MM-DD
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
    case "balanced":
    default:
      return "Use a balanced, clear, and professional but approachable tone.";
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string | null };
    const userId = body.userId || null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to use AI summary." },
        { status: 401 }
      );
    }

    // ✅ Athens date (matches your badge logic)
    const today = getTodayAthensYmd();

    // Load profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area, ui_language")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[ai-summary] profile error", profileError);
      // continue with defaults
    }

    const planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
    const isPro = planRaw === "pro" || planRaw === "founder";
    const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area || null;

    const languageCode = profile?.ui_language || "en";
    const languageInstruction = aiLanguageInstruction(languageCode);

    // Usage row
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && (usageError as any).code !== "PGRST116") {
      console.error("[ai-summary] usage select error", usageError);
      return NextResponse.json(
        { ok: false, error: "Could not check your AI usage." },
        { status: 500 }
      );
    }

    const currentCount = usage?.count || 0;

    if (!isPro && currentCount >= dailyLimit) {
      return NextResponse.json(
        {
          ok: false,
          error: "You’ve reached today’s AI limit. Try again tomorrow or upgrade.",
          plan: planRaw,
          dailyLimit,
        },
        { status: 429 }
      );
    }

    // Notes + tasks
    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notesErr) console.error("[ai-summary] notes load error", notesErr);

    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("title, description")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tasksErr) console.error("[ai-summary] tasks load error", tasksErr);

    const notesText = (notes || []).map((n: any) => `- ${n.content}`).join("\n");
    const tasksText = (tasks || [])
      .map((t: any) => `- ${t.title}${t.description ? ` – ${t.description}` : ""}`)
      .join("\n");

    const contextText = `
Recent notes:
${notesText || "(no recent notes)"}

Recent tasks:
${tasksText || "(no recent tasks)"}
`.trim();

    let systemPrompt = `
You are an AI summarizer inside a productivity app called "AI Productivity Hub".
${languageInstruction}
${toneDescription}

Create a very concise overview of the user's recent activity.
`.trim();

    if (focusArea) {
      systemPrompt += `\nThe user's main focus area is: "${focusArea}". Tailor insights toward it.`;
    }

    systemPrompt += `
Output format:
1) Short paragraph summary
2) 3 bullet points of key patterns
3) 2 concrete next-step suggestions
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextText },
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    const summary =
      completion.choices[0]?.message?.content?.trim() ||
      "Not enough data yet, but keep going!";

    // ✅ Update usage (same table used by badge)
    try {
      if (!usage) {
        const { error: insErr } = await supabaseAdmin.from("ai_usage").insert([
          { user_id: userId, usage_date: today, count: 1 },
        ]);
        if (insErr) console.error("[ai-summary] usage insert error", insErr);
      } else {
        const { error: updErr } = await supabaseAdmin
          .from("ai_usage")
          .update({ count: currentCount + 1 })
          .eq("id", usage.id);
        if (updErr) console.error("[ai-summary] usage update error", updErr);
      }
    } catch (e) {
      console.error("[ai-summary] usage write exception", e);
      // don't fail the request if usage write fails
    }

    return NextResponse.json({
      ok: true,
      summary,
      plan: planRaw,
      dailyLimit,
      usedToday: isPro ? currentCount + 1 : currentCount + 1,
      usageDate: today,
    });
  } catch (err: any) {
    console.error("[ai-summary] fatal", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "AI summary failed." },
      { status: 500 }
    );
  }
}
