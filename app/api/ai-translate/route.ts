// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type TranslateRequestBody = {
  text?: string | string[];
  targetLang?: string;
};

type BatchResult = {
  translations: string[];
};

function normalizeText(text: string): string {
  return text.trim();
}

async function translateBatchWithCache(
  texts: string[],
  targetLang: string
): Promise<BatchResult> {
  const normTexts = texts.map((t) => normalizeText(t));
  const langCode = targetLang.toLowerCase();

  // 1) Fetch existing translations from Supabase
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("page_translations")
    .select("original_text, translated_text")
    .eq("language_code", langCode)
    .in("original_text", normTexts);

  if (existingErr) {
    console.error("[ai-translate] fetch cache error", existingErr);
  }

  const cacheMap = new Map<string, string>();
  (existing || []).forEach((row) => {
    cacheMap.set(normalizeText(row.original_text), row.translated_text);
  });

  // 2) Build result array and find missing indices
  const result: string[] = [];
  const missingIndices: number[] = [];
  const missingItems: { index: number; text: string }[] = [];

  normTexts.forEach((t, idx) => {
    const cached = cacheMap.get(t);
    if (cached) {
      result[idx] = cached;
    } else {
      result[idx] = ""; // placeholder
      missingIndices.push(idx);
      missingItems.push({ index: idx, text: t });
    }
  });

  // If everything was cached, we’re done
  if (missingItems.length === 0) {
    return { translations: result };
  }

  // 3) Call OpenAI for missing ones only
  const systemPrompt = `
You are a translation engine for a productivity web app.
Translate each item in an array of snippets into the requested target language.

- Keep meaning and tone.
- Be natural and concise.
- Do NOT translate placeholders like {name}, {date}, {count}.
- Preserve punctuation and emojis where they add meaning.

Return ONLY valid JSON with this shape:

{
  "items": [
    { "index": 0, "translated": "..." },
    { "index": 1, "translated": "..." },
    ...
  ]
}

"index" must match the index in the provided "items" array.
`.trim();

  const userPrompt = `
Target language: ${langCode}

Input items (JSON):

${JSON.stringify(
  missingItems.map((item) => ({
    index: item.index,
    text: item.text,
  })),
  null,
  2
)}

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
    console.error("[ai-translate] JSON parse error", err, raw);
    throw new Error("Failed to parse translation response");
  }

  const items = parsed.items || [];

  // 4) Apply new translations to result and prepare rows to insert
  const rowsToInsert: {
    language_code: string;
    original_text: string;
    translated_text: string;
  }[] = [];

  for (const item of items) {
    if (
      typeof item.index === "number" &&
      item.index >= 0 &&
      item.index < normTexts.length &&
      typeof item.translated === "string"
    ) {
      const idx = item.index;
      const translated = item.translated.trim();
      const original = normTexts[idx];

      result[idx] = translated;

      rowsToInsert.push({
        language_code: langCode,
        original_text: original,
        translated_text: translated,
      });
    }
  }

  // 5) Store new translations in Supabase (ignore errors)
  if (rowsToInsert.length > 0) {
    const { error: insertErr } = await supabaseAdmin
      .from("page_translations")
      .upsert(rowsToInsert, {
        onConflict: "language_code,original_text",
      });

    if (insertErr) {
      console.error("[ai-translate] upsert cache error", insertErr);
    }
  }

  return { translations: result };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | TranslateRequestBody
      | null;

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

      const { translations } = await translateBatchWithCache(
        [text],
        targetLang
      );

      return NextResponse.json(
        {
          translation: translations[0] ?? "",
          error: null,
        },
        { status: 200 }
      );
    }

    // CASE 2: Array of strings
    if (Array.isArray(body.text)) {
      const texts = body.text.map((t) => String(t ?? ""));

      if (texts.every((t) => !t.trim())) {
        return NextResponse.json(
          { translation: texts, error: null },
          { status: 200 }
        );
      }

      const { translations } = await translateBatchWithCache(
        texts,
        targetLang
      );

      return NextResponse.json(
        {
          translation: translations,
          error: null,
        },
        { status: 200 }
      );
    }

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
