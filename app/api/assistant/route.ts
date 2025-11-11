import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

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
    const body = await req.json();
    const {
      message,
      userId,
      context,
    }: { message?: string; userId?: string; context?: string } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing userId or message." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    const today = getTodayString();

    // 1) Load profile for plan + preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Assistant: profile error", profileError);
    }

    const plan = (profile?.plan as "free" | "pro") || "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area || null;

    // 2) Current usage from ai_usage
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("Assistant: usage error", usageError);
      return NextResponse.json(
        { error: "Could not check your AI usage. Please try again later." },
        { status: 500 }
      );
    }

    const currentCount = usage?.count || 0;

    if (currentCount >= dailyLimit) {
      return NextResponse.json(
        {
          error:
            "You’ve reached today’s AI limit for your plan. Try again tomorrow or upgrade to Pro for higher limits.",
          plan,
          dailyLimit,
        },
        { status: 429 }
      );
    }

    // 3) Build system prompt
    let systemPrompt = `
You are an AI assistant inside a productivity web app called "AI Productivity Hub".
You help the user with their notes, tasks, planning, and productivity questions.

${toneDescription}
`.trim();

    if (focusArea) {
      systemPrompt += `\nThe user's main focus area is: "${focusArea}". Tailor your examples and suggestions towards that where helpful.`;
    }

    // 4) Build context text
    const fullContext = context
      ? `Additional app context:\n${context}`
      : "";

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...(fullContext
          ? [{ role: "system", content: fullContext } as const]
          : []),
        { role: "user", content: message },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Please try again.";

    // 5) Increment usage
    if (!usage) {
      const { error: insertError } = await supabaseAdmin
        .from("ai_usage")
        .insert([
          {
            user_id: userId,
            usage_date: today,
            count: 1,
          },
        ]);

      if (insertError) {
        console.error("Assistant: usage insert error", insertError);
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("ai_usage")
        .update({ count: currentCount + 1 })
        .eq("id", usage.id);

      if (updateError) {
        console.error("Assistant: usage update error", updateError);
      }
    }

    return NextResponse.json({
      reply: answer,
      plan,
      dailyLimit,
      usedToday: currentCount + 1,
    });
  } catch (err: any) {
    console.error("Assistant route error:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Something went wrong while talking to the assistant.",
      },
      { status: 500 }
    );
  }
}
