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
    const { userId } = body as { userId?: string | null };

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to use the daily planner." },
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

    // 1) Get plan
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Daily plan: profile error", profileError);
    }

    const plan = (profile?.plan as "free" | "pro") || "free";
    const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // 2) Current usage
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("Daily plan: usage error", usageError);
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

    // 3) Fetch upcoming / incomplete tasks
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("title, description, due_date, completed")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(30);

    if (tasksError) {
      console.error("Daily plan: tasks error", tasksError);
    }

    const tasksList = (tasks || []).filter((t: any) => !t.completed);

    const tasksText = tasksList
      .map((t: any, idx: number) => {
        const desc = t.description ? ` – ${t.description}` : "";
        const due = t.due_date ? ` (due: ${t.due_date})` : "";
        return `${idx + 1}. ${t.title}${desc}${due}`;
      })
      .join("\n");

    const contextText = `
Today: ${today}

Here are the user's upcoming / incomplete tasks:
${tasksText || "(no open tasks right now)"}
`.trim();

    const systemPrompt = `
You are an AI daily planner inside a web app called "AI Productivity Hub".
Given the user's tasks, create a focused plan JUST for today.

Output format in plain text:
1) A short motivating sentence.
2) A "Today's Top 3" list (if enough tasks).
3) A suggested order to tackle tasks (morning / afternoon / evening).
4) 2-3 concrete tips to stay focused.

Be encouraging, but also realistic. If there are very few or no tasks, say so and suggest one or two meaningful things they could do.
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

    const planText =
      completion.choices[0]?.message?.content ||
      "Not enough data to generate a meaningful plan yet, but you can add some tasks and try again.";

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
        console.error("Daily plan: usage insert error", insertError);
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("ai_usage")
        .update({ count: currentCount + 1 })
        .eq("id", usage.id);

      if (updateError) {
        console.error("Daily plan: usage update error", updateError);
      }
    }

    return NextResponse.json({
      plan: planText,
      planType: "daily",
      usedToday: currentCount + 1,
      dailyLimit,
      planAccount: plan,
    });
  } catch (err: any) {
    console.error("Daily plan route error:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Something went wrong while generating your plan.",
      },
      { status: 500 }
    );
  }
}
