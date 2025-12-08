// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type TranslateRequestBody = {
  text?: string | string[];
  targetLang?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as TranslateRequestBody | null;

    if (!body || body.text == null || !body.targetLang) {
      return NextResponse.json(
        { translation: null, error: "Missing text or targetLang" },
        { status: 400 }
      );
    }

    const targetLang = String(body.targetLang).trim();
    if (!targetLang) {
      return NextResponse.json(
        { translation: null, error: "Invalid targetLang" },
        { status: 400 }
      );
    }

    // CASE 1: Single string (backwards compatible)
    if (typeof body.text === "string") {
      const text = body.text.trim();

      if (!text) {
        return NextResponse.json(
          { translation: "", error: null },
          { status: 200 }
        );
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        // Let the model decide tokens; no need to force 4096
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
    }

    // CASE 2: Array of strings = batch translation
    if (Array.isArray(body.text)) {
      const texts = body.text.map((t) => String(t ?? "").trim());

      // Short-circuit: all empty
      if (texts.every((t) => !t)) {
        return NextResponse.json(
          { translation: texts, error: null },
          { status: 200 }
        );
      }

      const systemPrompt = `
You are a translation engine for a productivity web app.
Translate each item in an array of snippets into the requested target language.

- Keep meaning and tone.
- Be natural and concise.
- Do NOT translate placeholders like {name}, {date}, {count}.
- Return ONLY valid JSON with this shape:

{
  "items": [
    { "index": 0, "translated": "..." },
    { "index": 1, "translated": "..." },
    ...
  ]
}

"index" must match the index of the original text in the input array.
`.trim();

      const userPrompt = `
Target language: ${targetLang}

Input texts (JSON):

${JSON.stringify(texts, null, 2)}

Remember: respond with JSON only.
`.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";

      let parsed: {
        items?: { index?: number; translated?: string }[];
      };

      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error("[ai-translate] batch JSON parse error", err, raw);
        return NextResponse.json(
          {
            translation: null,
            error: "Failed to parse translation response",
          },
          { status: 500 }
        );
      }

      const items = parsed.items || [];
      const translatedArray = texts.slice(); // start with original (fallback)

      for (const item of items) {
        if (
          typeof item.index === "number" &&
          item.index >= 0 &&
          item.index < translatedArray.length &&
          typeof item.translated === "string"
        ) {
          translatedArray[item.index] = item.translated.trim();
        }
      }

      return NextResponse.json(
        {
          translation: translatedArray,
          error: null,
        },
        { status: 200 }
      );
    }

    // Shouldn't reach here
    return NextResponse.json(
      { translation: null, error: "Invalid text payload" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[ai-translate] error", err);

    const msg =
      typeof err?.message === "string" ? err.message : "Unknown error";
    const isRateLimit =
      msg.toLowerCase().includes("rate") &&
      msg.toLowerCase().includes("limit");

    const status = isRateLimit ? 429 : 500;

    return NextResponse.json(
      {
        translation: null,
        error: isRateLimit
          ? "AI translation is being rate-limited. Please try again in a few seconds."
          : "Translation service temporarily unavailable.",
      },
      { status }
    );
  }
}
