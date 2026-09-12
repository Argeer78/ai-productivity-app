import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAuthenticatedRateLimit, enforceProviderRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey, maxRetries: 0, timeout: 30_000 }) : null;

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
const requestSchema = z.object({ userId: z.string().optional(), goalText: z.string().trim().min(1).max(2_000), refine: z.boolean().optional() }).strict();

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: auth.error === "server_misconfigured" ? 500 : 401 });
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { goalText, refine } = parsedBody.data as PostBody;
    const userId = auth.user.id;

    const weekStart = getWeekStartDateString();
    let finalGoalText = goalText.trim();

    // Optional: refine goal with OpenAI
    if (refine && openai) {
      try {
        const rateLimit = await enforceProviderRateLimit({ request: req, action: "ai:weekly-goal", rateClass: "ai-light", verifiedUserId: userId });
        if (!rateLimit.ok) return rateLimit.response;
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
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: auth.error === "server_misconfigured" ? 500 : 401 });
    const userId = auth.user.id;
    const rateLimit = await enforceAuthenticatedRateLimit(userId, "weekly-goal:read", "authenticated-standard");
    if (!rateLimit.ok) return rateLimit.response;

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
