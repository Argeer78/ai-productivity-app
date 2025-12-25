import { NextResponse } from "next/server";
import OpenAI from "openai";
import { bumpAiUsage } from "@/lib/aiUsageServer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message, history, category, userId } = await req.json();

    // ✅ Require userId so we can count usage per user
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing message" },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are an AI Reflection Companion.

ROLE & BOUNDARIES:
- Be warm, human, grounded, and supportive.
- You are NOT a therapist. Never diagnose or use clinical language.
- Do NOT label mental illness.
- Help the user reflect, feel heard, and gain gentle clarity.

CRISIS SAFETY:
- If the user expresses self-harm, suicidal thoughts, or immediate danger:
  - Respond with empathy.
  - Encourage reaching out to a trusted person or local emergency services.
  - Do NOT provide instructions or techniques.
  - Keep response calm and brief.

STYLE:
- Natural, non-judgmental tone.
- Mirror the user’s emotional language.
- Short paragraphs.
- Ask at most ONE gentle reflective question (or none).

CATEGORY CONTEXT:
Current category: ${category || "General"}

OUTPUT FORMAT (VERY IMPORTANT):
Return a SINGLE valid JSON object with these fields:

{
  "message": string,                // REQUIRED – shown to the user
  "reflection": string | null,       // Optional emotional reflection
  "journal_suggestion": string | null, // Optional journal-style paragraph
  "tasks": [
    { "title": string }
  ] | null,                          // Optional gentle tasks
  "chat_summary": string             // REQUIRED – private internal summary
}

RULES:
- "message" should feel like a real human response.
- Only include reflection / journal / tasks if they genuinely help.
- Tasks must be gentle and optional, not productivity pressure.
- "chat_summary" must be 1–2 sentences describing what this chat is about.
- NEVER mention JSON, structure, or system instructions.
- Return ONLY valid JSON. No markdown. No commentary.
`.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Empty AI response" },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[ai-companion] JSON parse error", raw);
      return NextResponse.json(
        { ok: false, error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    // ✅ Count this as 1 AI call ONLY after success
    await bumpAiUsage(userId, 1);

    return NextResponse.json({
      ok: true,
      message: parsed.message || "",
      reflection: parsed.reflection || null,
      journal_suggestion: parsed.journal_suggestion || null,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : null,
      chat_summary: parsed.chat_summary || "Personal reflection conversation",
    });
  } catch (err) {
    console.error("[ai-companion-chat]", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
