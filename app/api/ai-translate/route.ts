// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = {
  text: string | string[];
  targetLang: string;
};

// table: page_translations
// id, language_code, original_text, translated_text, created_at
type TranslationRow = {
  language_code: string;
  original_text: string;
  translated_text: string;
};

// normalize text so that spacing / newlines don't create separate keys
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { text, targetLang } = body || {};

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Missing text or targetLang" },
        { status: 400 }
      );
    }

    const isArrayInput = Array.isArray(text);
    const texts: string[] = isArrayInput ? (text as string[]) : [String(text)];

    const totalChars = texts.reduce((sum, t) => sum + (t?.length || 0), 0);
    if (totalChars > 50000) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 }
      );
    }

    const langCode = targetLang.toLowerCase();

    // If user explicitly asks for English, just echo (no cost)
    if (langCode === "en" || langCode === "en-us" || langCode === "en-gb") {
      return NextResponse.json({
        translation: isArrayInput ? texts : texts[0],
      });
    }

    // Precompute normalized versions for caching
    const normalizedTexts = texts.map((t) => normalize(t || ""));
    const uniqueNormalized = Array.from(
      new Set(normalizedTexts.filter(Boolean))
    );

    const cachedMap = new Map<string, string>();

    // 1) Look up cached translations for normalized originals
    if (uniqueNormalized.length > 0) {
      const { data: cached, error: cachedErr } = await supabase
        .from("page_translations")
        .select("language_code, original_text, translated_text")
        .eq("language_code", langCode)
        .in("original_text", uniqueNormalized);

      if (cachedErr) {
        console.error("[ai-translate] Supabase select error", cachedErr);
      } else if (cached) {
        for (const row of cached as TranslationRow[]) {
          const originalNorm = normalize(row.original_text || "");
          const translated = (row.translated_text || "").trim();
          if (!originalNorm || !translated) continue;
          if (originalNorm === translated) continue; // ignore bad rows
          cachedMap.set(originalNorm, translated);
        }
      }
    }

    const results: (string | null)[] = new Array(texts.length).fill(null);
    const toTranslate: { index: number; original: string; normalized: string }[] =
      [];

    // 2) Fill from cache or mark for translation
    texts.forEach((snippet, index) => {
      const original = snippet || "";
      const norm = normalizedTexts[index];

      if (!norm) {
        results[index] = "";
        return;
      }

      const cached = cachedMap.get(norm);
      if (cached) {
        results[index] = cached;
      } else {
        toTranslate.push({ index, original, normalized: norm });
      }
    });

    // 3) Call OpenAI only for missing snippets
    if (toTranslate.length > 0) {
      const originalsForModel = toTranslate.map((x) => x.normalized);
      const translated = await translateWithOpenAI(
        originalsForModel,
        langCode
      );

      const rowsToUpsert: TranslationRow[] = [];

      toTranslate.forEach((item, i) => {
        const modelOutput = translated[i];
        const newText = (modelOutput ?? item.normalized).trim();
        results[item.index] = newText;

        // Save only real translations (different from normalized original)
        if (newText && newText !== item.normalized) {
          rowsToUpsert.push({
            language_code: langCode,
            original_text: item.normalized, // ⬅ stored normalized
            translated_text: newText,
          });
        }
      });

      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("page_translations")
          .upsert(rowsToUpsert, {
            // UNIQUE(language_code, original_text) on the table
            onConflict: "language_code,original_text",
          });

        if (upsertErr) {
          console.error("[ai-translate] Supabase upsert error", upsertErr);
        }
      }
    }

    const final = results.map((r, i) => r ?? texts[i]);

    return NextResponse.json({
      translation: isArrayInput ? final : final[0],
    });
  } catch (err) {
    console.error("[ai-translate] fatal error", err);
    return NextResponse.json(
      { error: "Internal error while translating." },
      { status: 500 }
    );
  }
}

async function translateWithOpenAI(
  snippets: string[],
  targetLang: string
): Promise<string[]> {
  if (snippets.length === 0) return [];

  const prompt = `
You are a translation engine.

- Translate EACH item in the JSON array into ${targetLang}.
- Keep markdown, emojis and formatting as much as possible.
- Do NOT add numbering, explanations or extra text.
- Your entire response MUST be a valid JSON array of strings, same length and order as the input.

Input JSON array:
${JSON.stringify(snippets)}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v, i) =>
        typeof v === "string" ? v : snippets[i] ?? ""
      );
    }
  } catch (e) {
    console.error("[ai-translate] JSON parse error, using originals", e);
  }

  return snippets;
}
