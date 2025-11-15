import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Compute the Monday of the current week
function getWeekStartDateString() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...
  const diffToMonday = (day + 6) % 7; // 0 if Mon, 1 if Tue, etc.
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return monday.toISOString().split("T")[0];
}

type PostBody = {
  userId: string;
  goalText: string;
  refine?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const { userId, goalText, refine } = body;

    if (!userId || !goalText?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or goalText." },
        { status: 400 }
      );
    }

    const weekStart = getWeekStartDateString();
    let finalGoalText = goalText.trim();

    // Optional: refine goal with OpenAI
    if (refine && openai) {
      try {
        const prompt = `
Rewrite this weekly goal to be specific, realistic, and action-focused,
in one short sentence.

Original goal: "${goalText}"
`.trim();

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a productivity coach. You rewrite goals to be specific, realistic and motivating, without changing their meaning.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 80,
        });

        const content = completion.choices[0]?.message?.content;
        if (content && typeof content === "string") {
          finalGoalText = content.trim();
        }
      } catch (err) {
        console.error("[weekly-goal] OpenAI refine error:", err);
        // fallback to original text
      }
    }

    // Upsert weekly goal for this week
    const { data, error } = await supabaseAdmin
      .from("weekly_goals")
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          goal_text: finalGoalText,
          completed: false,
        },
        { onConflict: "user_id,week_start" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("[weekly-goal] upsert error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to save weekly goal." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      goal: {
        id: data.id,
        goal_text: data.goal_text,
        week_start: data.week_start,
        completed: data.completed,
      },
    });
  } catch (err) {
    console.error("[weekly-goal] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Unknown error saving weekly goal." },
      { status: 500 }
    );
  }
}

// Optional GET: return latest weekly goal for the user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("weekly_goals")
      .select("id, goal_text, week_start, completed")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[weekly-goal] GET error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load weekly goal." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ ok: true, goal: null });
    }

    return NextResponse.json({ ok: true, goal: data });
  } catch (err) {
    console.error("[weekly-goal] GET unknown error:", err);
    return NextResponse.json(
      { ok: false, error: "Unknown error." },
      { status: 500 }
    );
  }
}
