// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { text?: string; targetLang?: string }
      | null;

    if (!body || !body.text || !body.targetLang) {
      return NextResponse.json(
        { translation: null, error: "Missing text or targetLang" },
        { status: 400 }
      );
    }

    const text = String(body.text).trim();
    const targetLang = String(body.targetLang).trim();

    if (!text) {
      return NextResponse.json(
        { translation: "", error: null },
        { status: 200 }
      );
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are a translation engine. " +
            "Translate the user text into the requested target language. " +
            "Return only the translated text, no explanations.",
        },
        {
          role: "user",
          content: `Target language: ${targetLang}\n\nText:\n${text}`,
        },
      ],
    });

    const translation =
      completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json(
      {
        translation,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[ai-translate] error", err);

    // If OpenAI returned a rate limit or similar, map to 429
    const msg = typeof err?.message === "string" ? err.message : "Unknown error";

    const isRateLimit =
      msg.toLowerCase().includes("rate") &&
      msg.toLowerCase().includes("limit");

    const status = isRateLimit ? 429 : 500;

    return NextResponse.json(
      {
        translation: null,
        error:
          isRateLimit
            ? "AI translation is being rate-limited. Please try again in a few seconds."
            : "Translation service temporarily unavailable.",
      },
      { status }
    );
  }
}
