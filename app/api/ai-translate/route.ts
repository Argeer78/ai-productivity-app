import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "[ai-translate] OPENAI_API_KEY is not set. Translation API will fail."
  );
}

const openai = apiKey
  ? new OpenAI({
      apiKey,
    })
  : null;

// export const maxDuration = 60; // optional on Vercel Edge

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { text, chunks, targetLang } = body as {
      text?: string;
      chunks?: string[];
      targetLang?: string;
    };

    if (!targetLang) {
      return NextResponse.json(
        { error: "Missing targetLang" },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured on server." },
        { status: 500 }
      );
    }

    // ---------- MULTI-CHUNK MODE (for page/site translation) ----------
    if (Array.isArray(chunks) && chunks.length > 0) {
      const cleanedChunks = chunks.map((c) =>
        typeof c === "string" ? c : String(c ?? "")
      );

      const SEP = "<<<SEGMENT_SEPARATOR>>>";
      const joined = cleanedChunks.join(SEP);

      const systemPrompt = `You are a translation engine.

You will receive multiple text segments concatenated into a single string.
Each segment is separated by this exact separator token:

${SEP}

Requirements:
- Translate each segment into the target language (${targetLang}).
- Keep meaning, tone, and basic formatting.
- Do NOT merge or split segments.
- Return the translated segments joined with the SAME separator token (${SEP}) and in the SAME order.
- Do NOT add any extra text before or after.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: joined },
        ],
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "";

      if (!raw) {
        return NextResponse.json(
          { error: "No translation generated for chunks." },
          { status: 500 }
        );
      }

      const parts = raw.split(SEP);

      if (parts.length !== cleanedChunks.length) {
        console.warn("[ai-translate] chunk length mismatch", {
          input: cleanedChunks.length,
          output: parts.length,
        });
        // still return whatever we got – client will handle partial mismatch
      }

      return NextResponse.json({
        translations: parts,
      });
    }

    // ---------- SINGLE-TEXT MODE (simple textarea) ----------
    if (!text) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a translation engine. Translate the user's text into the target language (${targetLang}).
- Keep meaning, tone and formatting as much as possible.
- Do NOT add explanations or comments.
- Only return the translated text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    });

    const translation = completion.choices[0]?.message?.content?.trim() || "";

    if (!translation) {
      return NextResponse.json(
        { error: "No translation generated." },
        { status: 500 }
      );
    }

    return NextResponse.json({ translation });
  } catch (err: any) {
    console.error("[ai-translate] error", err);
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
