// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // anon key is enough if RLS allows it
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = {
  text: string | string[];
  targetLang: string;
};

// matches your table: page_translations
// id, language_code, original_text, translated_text, created_at
type TranslationRow = {
  language_code: string;
  original_text: string;
  translated_text: string;
};

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

    // Normalize language code (store in lowercase)
    const langCode = targetLang.toLowerCase();

    // ⚠️ Do not translate English -> English (no cost)
    if (langCode === "en" || langCode === "en-us" || langCode === "en-gb") {
      return NextResponse.json({
        translation: isArrayInput ? texts : texts[0],
      });
    }

    // 1) Look up cached translations
    //    IMPORTANT: use the *exact* text as key, not trimmed,
    //    so it matches what’s in page_translations.original_text.
    const uniqueTexts = Array.from(
      new Set(
        texts
          .map((v) => v ?? "")
          .filter((v) => v.trim().length > 0) // ignore all-whitespace
      )
    );

    const cachedMap = new Map<string, string>();

    if (uniqueTexts.length > 0) {
      const { data: cached, error: cachedErr } = await supabase
        .from("page_translations")
        .select("language_code, original_text, translated_text")
        .eq("language_code", langCode)
        .in("original_text", uniqueTexts);

      if (cachedErr) {
        console.error("[ai-translate] Supabase select error", cachedErr);
      } else if (cached) {
        for (const row of cached as TranslationRow[]) {
          const original = row.original_text ?? "";
          const translated = row.translated_text ?? "";

          // skip empty rows just in case
          if (!original.trim() || !translated.trim()) continue;

          // also skip bogus cache where original===translated
          if (original.trim() === translated.trim()) continue;

          cachedMap.set(original, translated);
        }
      }
    }

    const results: (string | null)[] = new Array(texts.length).fill(null);
    const toTranslate: { index: number; original: string }[] = [];

    texts.forEach((snippet, index) => {
      const original = snippet ?? "";

      // skip empty / whitespace-only snippets
      if (!original.trim()) {
        results[index] = "";
        return;
      }

      const cached = cachedMap.get(original);
      if (cached) {
        // ✅ Use cached translation
        results[index] = cached;
      } else {
        // needs OpenAI
        toTranslate.push({ index, original });
      }
    });

    // 2) Call OpenAI only for missing snippets
    if (toTranslate.length > 0) {
      const originals = toTranslate.map((x) => x.original);
      const translated = await translateWithOpenAI(originals, langCode);

      const rowsToUpsert: TranslationRow[] = [];

      toTranslate.forEach((item, i) => {
        const newTextRaw = translated[i] ?? item.original;
        const newText = newTextRaw; // keep raw for DOM; we can trim only for checks

        results[item.index] = newText;

        // Only upsert *useful* translations
        if (newText.trim() && newText.trim() !== item.original.trim()) {
          rowsToUpsert.push({
            language_code: langCode,
            original_text: item.original, // exact text from DOM
            translated_text: newText,
          });
        }
      });

      // 3) Upsert cache
      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("page_translations")
          .upsert(rowsToUpsert, {
            // Your table must have UNIQUE(language_code, original_text)
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
