// app/api/ai-task-creator/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 20;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

// ✅ Match the rest of the codebase (assistant/daily-plan/etc.)
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("[ai-task-creator] Missing OPENAI_API_KEY");
      return NextResponse.json(
        { ok: false, error: "AI is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Missing request body." },
        { status: 400 }
      );
    }

    // ✅ Require userId so we can count usage consistently
    const userId = typeof body.userId === "string" ? body.userId : null;
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to use AI." },
        { status: 401 }
      );
    }

    // GUEST BYPASS
    const isGuest = userId === "guest" || userId.startsWith("demo-");

    let isPro = false;
    let planRaw = "free";
    let dailyLimit = FREE_DAILY_LIMIT;

    if (!isGuest) {
      // ✅ Load plan for limits
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("plan, email")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        console.error("[ai-task-creator] profile load error", profileErr);
        return NextResponse.json(
          { ok: false, error: "Failed to load user plan." },
          { status: 500 }
        );
      }

      planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const isAdmin = adminEmail && profile?.email && profile.email === adminEmail;
      isPro = planRaw === "pro" || planRaw === "founder" || isAdmin;
      dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
    }

    const today = getTodayString();
    let currentCount = 0;
    let usage: any = null;

    if (!isGuest) {
      // ✅ Check usage
      const { data: u, error: usageErr } = await supabaseAdmin
        .from("ai_usage")
        .select("id, count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .maybeSingle();

      usage = u;

      if (usageErr && (usageErr as any).code !== "PGRST116") {
        console.error("[ai-task-creator] usage select error", usageErr);
        return NextResponse.json(
          { ok: false, error: "Could not check AI usage." },
          { status: 500 }
        );
      }

      currentCount = usage?.count || 0;
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
    }

    // --- Existing fields ---
    const {
      gender,
      ageRange,
      jobRole,
      workType,
      hobbies,
      todayPlan,
      mainGoal,
      hoursAvailable,
      energyLevel,
      intensity,
    } = body as {
      gender?: string;
      ageRange?: string;
      jobRole?: string;
      workType?: string;
      hobbies?: string;
      todayPlan?: string;
      mainGoal?: string;
      hoursAvailable?: string;
      energyLevel?: number;
      intensity?: string;
    };

    const prompt = `
You are an expert productivity coach.

The user wants a realistic, personalized task list for TODAY only.

User profile:
- Gender: ${gender || "not specified"}
- Age range: ${ageRange || "not specified"}
- Main role: ${jobRole || "not specified"}
- Day type: ${workType || "not specified"}
- Hobbies / interests: ${hobbies || "not specified"}

Today's context:
- Plan / events: ${todayPlan || "not specified"}
- Main goal today: ${mainGoal || "not specified"}
- Hours available: ${hoursAvailable || "not specified"}
- Energy level (1–10): ${typeof energyLevel === "number" ? energyLevel : "not specified"
      }
- Intensity preference: ${intensity || "balanced"}

Instructions:
1. Propose a realistic list of TASKS for TODAY only.
2. Mix work/study tasks with at most 1–2 life/health/rest tasks.
3. Break bigger goals into small, actionable tasks (20–40 min each).
4. The total number of tasks should match their hours and intensity:
   - "<1 hour": 2–3 small tasks
   - "1–2": 4–6 small tasks
   - "2–4": 6–10 tasks total
   - "4plus": 8–12 tasks total
5. If energy is very low (<= 3), include "recovery" and ultra-simple tasks.
6. If energy is high (>= 8) and intensity is "aggressive", include 1–2 deeper-focus tasks.

Return ONLY valid JSON with this shape, nothing else:

{
  "tasks": [
    {
      "title": "short actionable task",
      "category": "Work" | "Study" | "Life" | "Health" | "Admin" | "Deep work",
      "size": "small" | "medium" | "big"
    }
  ]
}
`.trim();

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a helpful productivity coach that outputs STRICT JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content =
      completion.choices?.[0]?.message?.content?.trim() || '{"tasks":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("[ai-task-creator] JSON parse error:", err, content);
      return NextResponse.json(
        { ok: false, error: "AI returned an invalid response. Try again." },
        { status: 500 }
      );
    }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const normalized = tasks
      .map((t: any) => ({
        title: typeof t.title === "string" ? t.title.trim() : "",
        category: typeof t.category === "string" ? t.category.trim() : undefined,
        size: typeof t.size === "string" ? t.size.trim() : undefined,
      }))
      .filter((t: any) => t.title.length > 0);

    // ✅ Increment ai_usage AFTER success (kept same behavior)
    // ✅ Increment ai_usage AFTER success (kept same behavior)
    try {
      if (!isGuest) {
        if (!usage) {
          const { error: insErr } = await supabaseAdmin
            .from("ai_usage")
            .insert([{ user_id: userId, usage_date: today, count: 1 }]);
          if (insErr) console.error("[ai-task-creator] usage insert error", insErr);
        } else {
          const { error: updErr } = await supabaseAdmin
            .from("ai_usage")
            .update({ count: currentCount + 1 })
            .eq("id", usage.id);
          if (updErr) console.error("[ai-task-creator] usage update error", updErr);
        }
      }
    } catch (e) {
      console.error("[ai-task-creator] usage write exception", e);
    }

    return NextResponse.json(
      {
        ok: true,
        tasks: normalized,
        plan: planRaw,
        dailyLimit,
        usedToday: currentCount + 1,
        usageDate: today,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[ai-task-creator] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
