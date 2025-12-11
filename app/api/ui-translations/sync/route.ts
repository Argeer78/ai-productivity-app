// app/api/ui-translations/sync/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS } from "@/lib/uiStrings";

// If you already use the official OpenAI SDK elsewhere, you can import that instead.
// This version uses fetch for clarity.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn(
    "[ui-translations/sync] Missing OPENAI_API_KEY – auto-translation will fail."
  );
}

// Utility: chunk array into smaller pieces
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) || {};
    // e.g. { "languageCode": "el" }  or  { "languageCode": "el-GR" }
    const rawCode = (body.languageCode || "el").toString().trim();

    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "Missing languageCode in request body." },
        { status: 400 }
      );
    }

    const baseLang = rawCode.toLowerCase().split("-")[0]; // "el-gr" → "el"

    if (baseLang === "en") {
      return NextResponse.json(
        { ok: false, error: "No need to sync translations for 'en'." },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPENAI_API_KEY is not set. Define it in your environment to enable auto-translation.",
        },
        { status: 500 }
      );
    }

    // 1) Load existing translations for this language from Supabase
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", baseLang);

    if (existingError) {
      console.error("[ui-translations/sync] Supabase select error", existingError);
      return NextResponse.json(
        { ok: false, error: "Failed to read existing translations from Supabase." },
        { status: 500 }
      );
    }

    const existingMap = new Map<string, string>();
    (existingRows || []).forEach((row) => {
      if (row.key) {
        existingMap.set(row.key, row.text ?? "");
      }
    });

    // 2) Determine which keys are missing (or empty)
    const allKeys = Object.keys(UI_STRINGS) as (keyof typeof UI_STRINGS)[];
    const missingEntries = allKeys
      .filter((key) => {
        const current = existingMap.get(key);
        return !current || !current.trim();
      })
      .map((key) => ({
        key,
        english: UI_STRINGS[key],
      }));

    if (missingEntries.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          languageCode: baseLang,
          added: 0,
          message: "No missing UI keys for this language. Everything is up to date.",
        },
        { status: 200 }
      );
    }

    console.log(
      `[ui-translations/sync] Language=${baseLang} – missing keys:`,
      missingEntries.length
    );

    // 3) Call OpenAI in chunks to translate missing keys
    const CHUNK_SIZE = 30; // keep prompts small & cheap
    const chunks = chunkArray(missingEntries, CHUNK_SIZE);

    const rowsToUpsert: { language_code: string; key: string; text: string }[] = [];

    for (const chunk of chunks) {
      const keys = chunk.map((e) => e.key);
      const englishValues = chunk.map((e) => e.english);

      const prompt = `
You are translating a web app UI from English into language code "${baseLang}".

Translate each English string into that language, keeping it short and natural.
Do NOT explain anything. Return ONLY a valid JSON object where each key is the same
translation key and each value is the translated string.

Example:

INPUT KEYS: ["nav.dashboard", "nav.notes"]
INPUT ENGLISH: ["Dashboard", "Notes"]

VALID OUTPUT:
{"nav.dashboard": "Πίνακας ελέγχου", "nav.notes": "Σημειώσεις"}

Now translate the following keys:

KEYS: ${JSON.stringify(keys)}
ENGLISH: ${JSON.stringify(englishValues)}
`.trim();

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // or any model you prefer
          messages: [
            {
              role: "system",
              content:
                "You are a localization assistant that returns only JSON objects. No commentary.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!openaiRes.ok) {
        const text = await openaiRes.text().catch(() => "");
        console.error(
          "[ui-translations/sync] OpenAI error",
          openaiRes.status,
          text
        );
        return NextResponse.json(
          {
            ok: false,
            error: `OpenAI translation request failed with status ${openaiRes.status}`,
          },
          { status: 500 }
        );
      }

      const openaiJson = await openaiRes.json();
      const content =
        openaiJson?.choices?.[0]?.message?.content?.trim?.() || "{}";

      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        console.error(
          "[ui-translations/sync] Failed to parse JSON from OpenAI:",
          content
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              "Failed to parse JSON from OpenAI. Check server logs for details.",
          },
          { status: 500 }
        );
      }

      for (const key of keys) {
        const translated = (parsed[key] || "").toString().trim();
        if (!translated) continue;
        rowsToUpsert.push({
          language_code: baseLang,
          key,
          text: translated,
        });
      }
    }

    if (!rowsToUpsert.length) {
      return NextResponse.json(
        {
          ok: true,
          languageCode: baseLang,
          added: 0,
          message: "OpenAI did not return any translations.",
        },
        { status: 200 }
      );
    }

    // 4) Upsert translations into Supabase
    const { error: upsertError } = await supabaseAdmin
      .from("ui_translations")
      .upsert(rowsToUpsert, { onConflict: "language_code,key" });

    if (upsertError) {
      console.error("[ui-translations/sync] Supabase upsert error", upsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save translations to Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode: baseLang,
        added: rowsToUpsert.length,
        totalMissing: missingEntries.length,
        message: `Added/updated ${rowsToUpsert.length} translations for language "${baseLang}".`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations/sync] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error while syncing UI translations.",
      },
      { status: 500 }
    );
  }
}
