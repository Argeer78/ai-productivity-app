import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("[note-to-tasks] Missing OPENAI_API_KEY");
      return NextResponse.json(
        { ok: false, error: "AI is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content : "";

    if (!content.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing note content." },
        { status: 400 }
      );
    }

    const prompt = `
Extract actionable tasks from the note below.

Return ONLY valid JSON in this exact shape:

{
  "tasks": [
    {
      "title": "Task title",
      "due_natural": "tomorrow morning",
      "priority": "low" | "medium" | "high"
    }
  ]
}

If no tasks exist, return:
{ "tasks": [] }

NO markdown. NO extra text.

NOTE:
${content}
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
            content: "You output STRICT JSON only. No markdown. No extra text.",
          },
          { role: "user", content: prompt },
        ],
        // This is the key: forces JSON object output
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[note-to-tasks] OpenAI error:", response.status, text);
      return NextResponse.json(
        { ok: false, error: "AI failed to generate tasks." },
        { status: 500 }
      );
    }

    const json = (await response.json()) as any;
    const raw = json?.choices?.[0]?.message?.content || '{"tasks":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[note-to-tasks] JSON parse error:", err, raw);
      return NextResponse.json(
        { ok: false, error: "AI returned invalid JSON." },
        { status: 500 }
      );
    }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const normalized = tasks
      .map((t: any) => ({
        title: typeof t.title === "string" ? t.title.trim() : "",
        due_natural: typeof t.due_natural === "string" ? t.due_natural.trim() : null,
        due_iso: typeof t.due_iso === "string" ? t.due_iso.trim() : null,
        priority:
          t.priority === "low" || t.priority === "medium" || t.priority === "high"
            ? t.priority
            : null,
      }))
      .filter((t: any) => t.title.length > 0);

    return NextResponse.json({ ok: true, tasks: normalized }, { status: 200 });
  } catch (err: any) {
    console.error("[note-to-tasks] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
