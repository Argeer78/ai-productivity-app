import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content?.trim()) {
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
      "priority": "low | medium | high"
    }
  ]
}

If no tasks exist, return:
{ "tasks": [] }

NOTE:
- No explanations
- No markdown
- No text outside JSON

NOTE CONTENT:
${content}
`;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    // ✅ THIS IS WHERE YOUR CODE GOES
    const text = completion.output[0].content[0].text;

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[note-to-tasks] No JSON found:", text);
      return NextResponse.json(
        { ok: false, error: "AI did not return structured data." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[note-to-tasks] JSON parse failed:", jsonMatch[0]);
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
