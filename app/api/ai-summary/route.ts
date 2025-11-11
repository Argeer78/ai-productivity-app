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
    const { userId } = body as { userId?: string | null };

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to use AI summary." },
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

    // 1) Get plan + preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("AI summary: profile error", profileError);
    }

    const plan = (profile?.plan as "free" | "pro") || "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area || null;

    // 2) Current usage
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("AI summary: usage error", usageError);
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

    // 3) Fetch recent notes and tasks
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("notes")
      .select("content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notesError) {
      console.error("AI summary: notes error", notesError);
    }

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("title, description")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tasksError) {
      console.error("AI summary: tasks error", tasksError);
    }

    const notesText = (notes || [])
      .map((n: any) => `- ${n.content}`)
      .join("\n");

    const tasksText = (tasks || [])
      .map((t: any) => {
        const desc = t.description ? ` – ${t.description}` : "";
        return `- ${t.title}${desc}`;
      })
      .join("\n");

    const contextText = `
Recent notes:
${notesText || "(no recent notes)"}

Recent tasks:
${tasksText || "(no recent tasks)"}
`.trim();

    let systemPrompt = `
You are an AI summarizer inside a productivity app called "AI Productivity Hub".
Given the user's recent notes and tasks, create a very concise overview.

${toneDescription}
`.trim();

    if (focusArea) {
      systemPrompt += `\nThe user's main focus area is: "${focusArea}". Tailor your insights towards that area where helpful.`;
    }

    systemPrompt += `
Output format:
1) A short paragraph summary of their recent activity.
2) 3 bullet points of key themes or patterns.
3) 2 concrete suggestions for what they could focus on next.

If there isn't much data, be honest but still encouraging.
`;

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
      completion.choices[0]?.message?.content ||
      "Not enough data to generate a meaningful summary yet, but keep going!";

    // 4) Increment usage
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
        console.error("AI summary: usage insert error", insertError);
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("ai_usage")
        .update({ count: currentCount + 1 })
        .eq("id", usage.id);

      if (updateError) {
        console.error("AI summary: usage update error", updateError);
      }
    }

    return NextResponse.json({
      summary,
      plan,
      dailyLimit,
      usedToday: currentCount + 1,
    });
  } catch (err: any) {
    console.error("AI summary route error:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Something went wrong while generating your summary.",
      },
      { status: 500 }
    );
  }
}
