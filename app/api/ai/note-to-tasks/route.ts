import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiTask = {
  title?: string;
  due_natural?: string | null;
  priority?: "low" | "medium" | "high" | null;
};

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing note content." },
        { status: 400 }
      );
    }

    const prompt = `
You extract actionable tasks from notes.

RULES (VERY IMPORTANT):
- Respond with ONLY valid JSON
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include text outside JSON
- If no tasks exist, return { "tasks": [] }

JSON FORMAT:
{
  "tasks": [
    {
      "title": "Task title",
      "due_natural": "tomorrow morning",
      "priority": "low | medium | high"
    }
  ]
}

NOTE:
${content}
`;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    /**
     * 🔎 Safely extract text from Responses API output
     */
    const message = completion.output.find(
      (item: any) => item.type === "message"
    );

    if (!message || !Array.isArray(message.content)) {
      console.error("[note-to-tasks] No message output:", completion.output);
      return NextResponse.json(
        { ok: false, error: "AI returned no usable output." },
        { status: 500 }
      );
    }

    const text = message.content
      .filter((c: any) => c.type === "output_text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("")
      .trim();

    if (!text) {
      console.error("[note-to-tasks] Empty AI response");
      return NextResponse.json(
        { ok: false, error: "AI returned empty response." },
        { status: 500 }
      );
    }

    /**
     * 🧠 Parse JSON directly (NO regex unless needed)
     */
    let parsed: { tasks?: AiTask[] };

    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[note-to-tasks] Invalid JSON:", text);
      return NextResponse.json(
        { ok: false, error: "AI returned invalid JSON." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    });
  } catch (err) {
    console.error("[note-to-tasks] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
