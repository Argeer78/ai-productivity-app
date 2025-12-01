// app/api/ai-task-creator/route.ts
import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("[ai-task-creator] Missing OPENAI_API_KEY");
      return NextResponse.json(
        { ok: false, error: "AI is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Missing request body." },
        { status: 400 }
      );
    }

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
- Energy level (1–10): ${typeof energyLevel === "number" ? energyLevel : "not specified"}
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful productivity coach that outputs STRICT JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[ai-task-creator] OpenAI error:", response.status, text);
      return NextResponse.json(
        { ok: false, error: "AI failed to generate tasks." },
        { status: 500 }
      );
    }

    const json = (await response.json()) as any;
    const content =
      json?.choices?.[0]?.message?.content?.trim() || '{"tasks":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("[ai-task-creator] JSON parse error:", err, content);
      return NextResponse.json(
        {
          ok: false,
          error: "AI returned an invalid response. Try again.",
        },
        { status: 500 }
      );
    }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    // Normalize tasks a bit
    const normalized = tasks
      .map((t: any) => ({
        title: typeof t.title === "string" ? t.title.trim() : "",
        category:
          typeof t.category === "string" ? t.category.trim() : undefined,
        size: typeof t.size === "string" ? t.size.trim() : undefined,
      }))
      .filter((t: any) => t.title.length > 0);

    return NextResponse.json({ ok: true, tasks: normalized }, { status: 200 });
  } catch (err: any) {
    console.error("[ai-task-creator] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
