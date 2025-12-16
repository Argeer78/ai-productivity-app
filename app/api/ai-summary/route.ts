import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiLanguageInstruction } from "@/lib/aiLanguage";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 2000;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
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
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { userId } = body as { userId?: string | null };

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to use AI summary." },
        { status: 401 }
      );
    }

    const today = getTodayString();

    // ✅ Make sure the column name matches your DB:
    // If your profiles column is `language`, change this select accordingly.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area, ui_language")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("AI summary: profile error", profileError);
    }

    const plan = (profile?.plan as "free" | "pro") || "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area || null;

    const languageCode = profile?.ui_language || "en";
    const languageInstruction = aiLanguageInstruction(languageCode);

    // Usage
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Could not check your AI usage." },
        { status: 500 }
      );
    }

    const currentCount = usage?.count || 0;
    if (currentCount >= dailyLimit) {
      return NextResponse.json(
        {
          error: "You’ve reached today’s AI limit. Try again tomorrow or upgrade.",
          plan,
          dailyLimit,
        },
        { status: 429 }
      );
    }

    // Notes + tasks
    const { data: notes } = await supabaseAdmin
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("title, description")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

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
        { role: "system", content: languageInstruction }, // ✅ reinforcement
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    const summary =
      completion.choices[0]?.message?.content ||
      "Not enough data yet, but keep going!";

    // Update usage
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
      summary,
      plan,
      dailyLimit,
      usedToday: currentCount + 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "AI summary failed." },
      { status: 500 }
    );
  }
}
