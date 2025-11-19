// app/api/ai-hub-chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type HistoryMsg = {
  role: "user" | "assistant";
  content: string;
};

// Helper: generate a short title from first user message
async function generateTitleFromMessage(message: string): Promise<string> {
  const fallback =
    message.trim().length > 0
      ? message.trim().slice(0, 60)
      : "New conversation";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 20,
      messages: [
        {
          role: "system",
          content:
            "You are helping name chat conversations. " +
            "Return a very short (3–6 words) descriptive title. " +
            "Do not use quotes or punctuation at the start/end.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const raw =
      completion.choices[0]?.message?.content?.trim() || fallback;

    const cleaned = raw.replace(/^["“”']+|["“”']+$/g, "").trim();
    return cleaned || fallback;
  } catch (err) {
    console.error("[ai-hub-chat] title generation error", err);
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          userMessage?: string;
          category?: string | null;
          history?: HistoryMsg[];
        }
      | null;

    if (!body?.userMessage || !body.userMessage.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing userMessage" },
        { status: 400 }
      );
    }

    const userMessage = body.userMessage.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      {
        role: "system",
        content:
          "You are the AI coach in a productivity app called AI Productivity Hub. " +
          "Be friendly, concise, and practical. Help with planning, focus, mindset, and general questions.",
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 600,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a response.";

    let title: string | null = null;
    if (history.length === 0) {
      // First message in the conversation → generate title
      title = await generateTitleFromMessage(userMessage);
    }

    return NextResponse.json(
      {
        ok: true,
        assistantMessage,
        title,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ai-hub-chat] route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
