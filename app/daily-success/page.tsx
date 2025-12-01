// app/api/daily-score/suggest/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Admin Supabase client (service role) – server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { userId?: string }
      | null;

    if (!body?.userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId." },
        { status: 400 }
      );
    }

    const userId = body.userId;
    const today = getTodayDateString();

    // 1) Load today's tasks
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("title, completed, due_date, created_at")
      .eq("user_id", userId)
      .gte("created_at", today);

    if (tasksErr) {
      console.error("[daily-score/suggest] tasks error", tasksErr);
    }

    // 2) Load recent notes (e.g. last 10)
    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (notesErr) {
      console.error("[daily-score/suggest] notes error", notesErr);
    }

    const tasksText =
      (tasks || [])
        .map(
          (t) =>
            `- [${t.completed ? "x" : " "}] ${t.title || "(untitled task)"}`
        )
        .join("\n") || "No tasks today.";

    const notesText =
      (notes || [])
        .map((n) => `- ${n.content?.slice(0, 200) || "(empty note)"}`)
        .join("\n") || "No notes captured.";

    const prompt = `
You are helping a user rate how their day went from 0 to 100.

- 0 = terrible day, everything felt off.
- 50 = mixed day, some things done but also stress / distractions.
- 100 = excellent day, they did what mattered and felt good about it.

You will see their tasks and notes for today. Based on that, suggest a realistic score between 0 and 100 and a short explanation.

User's tasks today:
${tasksText}

User's recent notes:
${notesText}

Respond ONLY in strict JSON like:
{"score": 72, "reason": "Short explanation here"}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful productivity coach." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    let score = 70;
    let reason =
      "AI suggested this score based on your tasks and notes for today.";

    try {
      const parsed = JSON.parse(raw as string);
      if (typeof parsed.score === "number") {
        score = Math.max(0, Math.min(100, parsed.score));
      }
      if (typeof parsed.reason === "string") {
        reason = parsed.reason;
      }
    } catch (e) {
      console.error("[daily-score/suggest] JSON parse error", e, raw);
    }

    return NextResponse.json(
      {
        ok: true,
        score,
        reason,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[daily-score/suggest] unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
