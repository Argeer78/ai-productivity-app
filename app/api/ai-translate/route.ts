// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Supabase server-side client (uses SERVICE_ROLE for easy upsert)
// If you prefer anon key + RLS, you can use NEXT_PUBLIC_SUPABASE_ANON_KEY here instead.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = {
  text: string | string[];
  targetLang: string;
};

type TranslationRow = {
  target_lang: string;
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

    // Normalise to array so we can handle string | string[]
    const isArrayInput = Array.isArray(text);
    const texts: string[] = isArrayInput ? (text as string[]) : [String(text)];

    // Basic safety limits (mirror your client limits loosely)
    const totalChars = texts.reduce((sum, t) => sum + (t?.length || 0), 0);
    if (totalChars > 50000) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 }
      );
    }

    // If targetLang looks like English, you *can* short-circuit here
    // so you don't pay to "translate" English → English:
    const target = targetLang.toLowerCase();
    if (target === "en" || target === "en-us" || target === "en-gb") {
      return NextResponse.json({
        translation: isArrayInput ? texts : texts[0],
      });
    }

    // 1) Look up existing translations in Supabase
    const uniqueTexts = Array.from(
      new Set(texts.map((t) => (t || "").trim()).filter(Boolean))
    );

    let cachedMap = new Map<string, string>();

    if (uniqueTexts.length > 0) {
      const { data: cached, error: cachedErr } = await supabase
        .from("page_translations")
        .select("original_text, translated_text")
        .eq("target_lang", targetLang)
        .in("original_text", uniqueTexts);

      if (cachedErr) {
        console.error("[ai-translate] Supabase select error", cachedErr);
      } else if (cached) {
        for (const row of cached as TranslationRow[]) {
          cachedMap.set(row.original_text, row.translated_text);
        }
      }
    }

    // 2) Decide which snippets still need translation
    const results: (string | null)[] = new Array(texts.length).fill(null);
    const toTranslate: { index: number; original: string }[] = [];

    texts.forEach((snippet, index) => {
      const original = (snippet || "").trim();
      if (!original) {
        results[index] = "";
        return;
      }

      const cached = cachedMap.get(original);
      if (cached) {
        results[index] = cached;
      } else {
        toTranslate.push({ index, original });
      }
    });

    // 3) Call OpenAI **only for missing snippets**
    if (toTranslate.length > 0) {
      const newOriginals = toTranslate.map((item) => item.original);

      const newTranslations = await translateWithOpenAI(
        newOriginals,
        targetLang
      );

      // 4) Fill results + prepare rows to upsert into Supabase
      const rowsToUpsert: TranslationRow[] = [];

      toTranslate.forEach((item, i) => {
        const translated = newTranslations[i] ?? item.original;
        results[item.index] = translated;

        rowsToUpsert.push({
          target_lang: targetLang,
          original_text: item.original,
          translated_text: translated,
        });
      });

      // 5) Upsert to Supabase so future calls are free
      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("page_translations")
          .upsert(rowsToUpsert, {
            onConflict: "target_lang,original_text",
          });

        if (upsertErr) {
          console.error("[ai-translate] Supabase upsert error", upsertErr);
        }
      }
    }

    const finalTranslations = results.map((r, i) => r ?? texts[i]);

    return NextResponse.json({
      translation: isArrayInput ? finalTranslations : finalTranslations[0],
    });
  } catch (err: any) {
    console.error("[ai-translate] fatal error", err);
    return NextResponse.json(
      { error: "Internal error while translating." },
      { status: 500 }
    );
  }
}

// --- Helper: call OpenAI once for an array of snippets ---
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

  const content = completion.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((x, i) =>
        typeof x === "string" ? x : snippets[i] ?? ""
      );
    }
  } catch (e) {
    console.error("[ai-translate] JSON parse error, returning originals", e);
  }

  // Fallback: if the model didn’t follow instructions, just return originals
  return snippets;
}
