import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 })
  : null;

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8_000) }).strict();
const attachmentSchema = z.object({ name: z.string().max(255), content: z.string().max(50_000) }).strict();
const requestSchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  history: z.array(messageSchema).max(20).optional(),
  category: z.string().max(100).optional(),
  lang: z.string().regex(/^[a-z]{2}(-[a-z]{2})?$/i).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
  userId: z.string().max(128).optional(),
  threadId: z.string().max(128).nullable().optional(),
}).strict();

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.aiTextJson);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;
    const { message, history, category, lang, attachments } = body;
    const requestedUserId = typeof body.userId === "string" ? body.userId : "";
    const isGuest = requestedUserId === "guest" || requestedUserId.startsWith("demo-");
    const auth = isGuest ? null : await getAuthenticatedUser(req);

    if (!isGuest && !auth?.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: auth?.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { ok: false, error: "AI is not configured on this environment" },
        { status: 503 }
      );
    }

    const userId = isGuest ? requestedUserId : auth?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceProviderRateLimit({
      request: req,
      action: "ai:companion-chat",
      rateClass: "ai-light",
      verifiedUserId: auth?.user?.id,
    });
    if (!rateLimit.ok) return rateLimit.response;

    const userLang = lang || "en";

    // ✅ Handle Attachments (Pro/Founder only)
    let contextFromFiles = "";
    if (Array.isArray(attachments) && attachments.length > 0) {
      // Check Plan
      let isPro = false;
      if (!isGuest) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .single();
        isPro = profile?.plan === "pro" || profile?.plan === "founder";
      }

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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
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
    } catch {
      console.error("[ai-companion] provider returned invalid JSON");
      return NextResponse.json(
        { ok: false, error: "Invalid AI response format" },
        { status: 503 }
      );
    }

    // ✅ Count this as 1 AI call ONLY after success
    if (!isGuest) {
      await bumpAiUsage(userId, 1);
    }

    return NextResponse.json({
      ok: true,
      message: parsed.message || "",
      reflection: parsed.reflection || null,
      journal_suggestion: parsed.journal_suggestion || null,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : null,
      chat_summary: parsed.chat_summary || "Personal reflection conversation",
    });
  } catch {
    console.error("[ai-companion-chat] request failed");
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
