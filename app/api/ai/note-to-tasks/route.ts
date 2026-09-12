import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceProviderRateLimit } from "@/lib/rateLimit";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const requestSchema = z.object({ content: z.string().trim().min(1).max(20_000) }).strict();

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.aiTextJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { content } = parsedBody.data;

    if (!OPENAI_API_KEY) {
      console.error("[note-to-tasks] Missing OPENAI_API_KEY");
      return NextResponse.json(
        { ok: false, error: "AI is not configured on the server." },
        { status: 503 }
      );
    }

    const rateLimit = await enforceProviderRateLimit({ request: req, action: "ai:note-to-tasks", rateClass: "ai-light" });
    if (!rateLimit.ok) return rateLimit.response;

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
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error("[note-to-tasks] provider request failed", { status: response.status });
      return NextResponse.json(
        { ok: false, error: "AI failed to generate tasks." },
        { status: 503 }
      );
    }

    const json = (await response.json()) as any;
    const raw = json?.choices?.[0]?.message?.content || '{"tasks":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[note-to-tasks] provider returned invalid JSON");
      return NextResponse.json(
        { ok: false, error: "AI returned invalid JSON." },
        { status: 503 }
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
  } catch {
    console.error("[note-to-tasks] request failed");
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
