import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 300;

const ADMIN_KEY = process.env.ADMIN_KEY || "";

// Supported target languages
const SUPPORTED_TARGET_LANGS = [
  "de", "es", "fr", "it", "pt", "el", "tr", "ru", "ro",
  "ar", "he", "zh", "ja", "id", "sr", "bg", "hu", "pl", "cs", "da", "sv", "nb", "nl", "hi", "ko",
] as const;

type TargetLangCode = (typeof SUPPORTED_TARGET_LANGS)[number];

function isSupportedTargetLang(code: string): code is TargetLangCode {
  return SUPPORTED_TARGET_LANGS.includes(code as TargetLangCode);
}

const LANGUAGE_LABELS: Record<TargetLangCode, string> = {
  de: "German", es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese", el: "Greek", 
  tr: "Turkish", ru: "Russian", ro: "Romanian", ar: "Arabic (Modern Standard)", he: "Hebrew", 
  zh: "Chinese (Simplified)", ja: "Japanese", id: "Indonesian", sr: "Serbian", bg: "Bulgarian", 
  hu: "Hungarian", pl: "Polish", cs: "Czech", da: "Danish", sv: "Swedish", nb: "Norwegian (Bokmål)", 
  nl: "Dutch (Netherlands)", hi: "Hindi", ko: "Korean",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translateBatch({ texts, targetLang }: { texts: string[], targetLang: string }): Promise<string[]> {
  const prompt = [
    `Translate each item to ${targetLang}.`,
    `Return STRICT JSON only as: {"translations":["...","..."]}`,
    `Rules: preserve meaning, keep formatting, do not add commentary.`,
    `Items:`,
    JSON.stringify(texts),
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "You are a careful translation engine." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200,
  });

  const raw = completion.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(raw);
    const arr = parsed?.translations;
    if (!Array.isArray(arr)) throw new Error("Missing translations array");

    if (arr.length !== texts.length) {
      return texts.map((_, i) => String(arr[i] ?? ""));
    }
    return arr.map((x: any) => String(x ?? ""));
  } catch {
    return texts;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminHeader = req.headers.get("X-Admin-Key") || "";
    if (!ADMIN_KEY || adminHeader !== ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const targetLangRaw = (body?.languageCode || "").trim().toLowerCase();

    if (!targetLangRaw) {
      return NextResponse.json({ ok: false, error: "Missing languageCode in body" }, { status: 400 });
    }

    if (!isSupportedTargetLang(targetLangRaw)) {
      return NextResponse.json({ ok: false, error: `Unsupported target language '${targetLangRaw}'.` }, { status: 400 });
    }

    const targetLang = targetLangRaw as TargetLangCode;
    const targetLabel = LANGUAGE_LABELS[targetLang];

    const { data: enRows, error: enError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", "en");

    const baseMap: Record<string, string> = {};

    if (!enError && enRows && enRows.length > 0) {
      for (const row of enRows) {
        if (!row.key || typeof row.text !== "string") continue;
        baseMap[row.key] = row.text;
      }
    } else {
      (Object.keys(UI_STRINGS) as UiTranslationKey[]).forEach((key) => {
        baseMap[key] = UI_STRINGS[key];
      });
    }

    const keys = Object.keys(baseMap);
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, error: "No English base strings found to translate." }, { status: 400 });
    }

    const rows = keys.map((key) => {
      const text = baseMap[key];
      return { key, language_code: targetLang, text };
    });

    // 5) Check if translations are missing for the target language
    const { data: existingRows, error: exErr } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", targetLang);

    if (exErr) {
      return NextResponse.json({ ok: false, error: "Error loading existing translations." }, { status: 500 });
    }

    const existingKeys = new Set(existingRows?.map((row: any) => row.key));
    const missingKeys = rows.filter(row => !existingKeys.has(row.key));

    if (missingKeys.length === 0) {
      return NextResponse.json({ ok: true, message: `No missing keys for language '${targetLang}'` }, { status: 200 });
    }

    // Translate missing keys
    const missingTexts = missingKeys.map((row) => row.text);
    const translatedTexts = await translateBatch({ texts: missingTexts, targetLang });

    // Update the rows with translated texts
    missingKeys.forEach((row, index) => {
      row.text = translatedTexts[index];
    });

    // 6) Upsert translations into the database
    const { error: upsertError } = await supabaseAdmin
      .from("ui_translations")
      .upsert(missingKeys, {
        onConflict: "key,language_code",
      });

    if (upsertError) {
      console.error("[ui-translation-sync] upsert error:", upsertError);
      return NextResponse.json({ ok: false, error: "Failed to upsert translations" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      languageCode: targetLang,
      insertedOrUpdated: missingKeys.length,
    }, { status: 200 });
  } catch (err: any) {
    console.error("[ui-translation-sync] unexpected error:", err);
    return NextResponse.json({
      ok: false,
      error: "Unexpected server error while syncing UI translations.",
    }, { status: 500 });
  }
}
