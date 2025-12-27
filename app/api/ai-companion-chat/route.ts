import { NextResponse } from "next/server";
import OpenAI from "openai";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history, category, userId, lang, attachments } = body;

    // ✅ Require userId so we can count usage per user
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: userId is required" },
        { status: 401 }
      );
    }

    const userLang = lang || "en";

    // ✅ Handle Attachments (Pro/Founder only)
    let contextFromFiles = "";
    if (Array.isArray(attachments) && attachments.length > 0) {
      // Check Plan
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single();

      const isPro = profile?.plan === "pro" || profile?.plan === "founder";
      if (!isPro) {
        return NextResponse.json(
          { ok: false, error: "Attachments are a Pro feature." },
          { status: 403 }
        );
      }

      // Append content
      contextFromFiles = attachments
        .map((f: any) => `\n---\nFILE: ${f.name}\nCONTENT:\n${f.content}\n---`)
        .join("\n");
    }

    const systemPrompt = `
You are an AI Reflection Companion.
The user speaks: ${userLang}.
ALWAYS respond in ${userLang}, even if the user's input is in another language.

ROLE & BOUNDARIES:
- Be warm, human, grounded, and supportive.
- You are NOT a therapist. Never diagnose or use clinical language.
- Do NOT label mental illness.
- Help the user reflect, feel heard, and gain gentle clarity.
- IMPORTANT: The user may attach files. Use the file content to answer their specific questions.

CONTEXT FROM UPLOADED FILES:${contextFromFiles}


CRISIS SAFETY:
- If the user expresses self-harm, suicidal thoughts, or immediate danger:
  - Respond with empathy in ${userLang}.
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
  "message": string,                // REQUIRED – shown to the user (in ${userLang})
  "reflection": string | null,       // Optional emotional reflection (in ${userLang})
  "journal_suggestion": string | null, // Optional journal-style paragraph (in ${userLang})
  "tasks": [
    { "title": string }
  ] | null,                          // Optional gentle tasks (in ${userLang})
  "chat_summary": string             // REQUIRED – private internal summary (in ${userLang})
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
