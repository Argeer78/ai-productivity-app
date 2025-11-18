import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "[ai-translate] OPENAI_API_KEY is not set. Translation API will fail."
  );
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Keep this comfortably below model context so a single call doesn't blow up
const MAX_INPUT_CHARS = 6000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { text, targetLang } = body as {
      text?: string;
      targetLang?: string;
    };

    if (!targetLang || typeof targetLang !== "string") {
      return NextResponse.json(
        { error: "Missing targetLang." },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Missing text to translate." },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured on server." },
        { status: 500 }
      );
    }

    const trimmed = text.trim();

    // 🧯 Guard against insanely long payloads
    if (trimmed.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        {
          error:
            `Text too long for a single translation call. ` +
            `Got ~${trimmed.length} characters, max allowed is ${MAX_INPUT_CHARS}. ` +
            `Please split the text into smaller chunks.`,
        },
        { status: 413 }
      );
    }

    const systemPrompt = `You are a pure translation engine.

Translate ALL user text into the target language: "${targetLang}".

Rules:
- Preserve meaning, tone, punctuation and formatting as closely as possible.
- Do NOT explain, comment, add emojis or extra sentences.
- Only return the translated text.

SPECIAL CASE – MULTI-SEGMENT INPUT:
Sometimes the user text may contain multiple segments joined with the EXACT delimiter:

\\n\\n----\\n\\n

When that happens:
- Treat each segment independently.
- Do NOT add, remove, move, or rename delimiters.
- Do NOT merge or split segments.
- Output the same number of segments in the same order,
  joined by the SAME delimiter string.
`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmed },
        ],
        // low temperature = more deterministic, fewer weird formats
        temperature: 0.1,
        max_tokens: 2000,
      });
    } catch (err: any) {
      const code = err?.status || err?.code;

      // Rate limit – common cause of random 500s
      if (code === 429) {
        console.error("[ai-translate] OpenAI rate-limited", err);
        return NextResponse.json(
          {
            error:
              "AI translation is temporarily rate-limited. Please wait a few seconds and try again.",
          },
          { status: 429 }
        );
      }

      console.error("[ai-translate] OpenAI error", err);
      return NextResponse.json(
        {
          error:
            "Upstream AI provider error while translating. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const translation =
      completion.choices?.[0]?.message?.content?.trim() || "";

    if (!translation) {
      console.error("[ai-translate] empty translation result", completion);
      return NextResponse.json(
        { error: "No translation generated." },
        { status: 500 }
      );
    }

    return NextResponse.json({ translation });
  } catch (err: any) {
    console.error("[ai-translate] route error", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Server error while translating. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}
