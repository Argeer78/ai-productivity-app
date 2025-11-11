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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, context, userId } = body as {
      message?: string;
      context?: string;
      userId?: string | null;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to use the assistant." },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const today = getTodayString();

    // 1) Find user plan
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Assistant: profile query error", profileError);
      // default to free if profile missing or error
    }

    const plan = (profile?.plan as "free" | "pro") || "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // 2) Get current usage for today
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("Assistant: usage query error", usageError);
      // don't block on usageError; we can still proceed, but safer to stop:
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

    // 3) Call OpenAI
    const systemPrompt = `
You are an AI assistant inside a web app called "AI Productivity Hub".
Help the user with writing, summarizing, planning, or breaking down tasks.
Be concise and practical. If user refers to "my notes" or "my tasks",
answer generally unless context was provided.

${context ? `Extra context:\n${context}` : ""}
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    // 4) Log usage (increment ai_usage)
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

    return NextResponse.json({ reply, plan, dailyLimit, usedToday: currentCount + 1 });
  } catch (err: any) {
    console.error("Assistant API error:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Something went wrong while talking to the assistant.",
      },
      { status: 500 }
    );
  }
}
