// app/api/admin/ui-translation-sync/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";
import OpenAI from "openai";

// Server-side admin key (DO NOT expose this one to client)
const ADMIN_KEY = process.env.ADMIN_KEY || "";

/**
 * All language codes we want to support for AI sync.
 * This should mirror (or be a subset of) the Locale type / SUPPORTED_LANGS
 * in lib/i18n.ts, but we exclude "en" because English is our base.
 */
const SUPPORTED_TARGET_LANGS = [
  // Original set
  "de",
  "es",
  "fr",
  "it",
  "pt",
  "el",
  "tr",
  "ru",
  "ro",

  // New ones
  "ar", // Arabic (Standard)
  "he", // Hebrew
  "zh", // Chinese (Simplified)
  "ja", // Japanese
  "id", // Indonesian
  "sr", // Serbian
  "bg", // Bulgarian
  "hu", // Hungarian
  "pl", // Polish
  "cs", // Czech
  "da", // Danish
  "sv", // Swedish
  "nb", // Norwegian (Bokmål)
  "nl", // Dutch (Netherlands)
  "hi", // Hindi
  "ko", // Korean
] as const;

type TargetLangCode = (typeof SUPPORTED_TARGET_LANGS)[number];

function isSupportedTargetLang(code: string): code is TargetLangCode {
  return SUPPORTED_TARGET_LANGS.includes(code as TargetLangCode);
}

// For nicer prompts – label each language in English so the model knows what to do.
const LANGUAGE_LABELS: Record<TargetLangCode, string> = {
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  el: "Greek",
  tr: "Turkish",
  ru: "Russian",
  ro: "Romanian",

  ar: "Arabic (Modern Standard)",
  he: "Hebrew",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  id: "Indonesian",
  sr: "Serbian",
  bg: "Bulgarian",
  hu: "Hungarian",
  pl: "Polish",
  cs: "Czech",
  da: "Danish",
  sv: "Swedish",
  nb: "Norwegian (Bokmål)",
  nl: "Dutch (Netherlands)",
  hi: "Hindi",
  ko: "Korean",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // must be set in env
});

export async function POST(req: NextRequest) {
  try {
    // 1) Check admin key
    const adminHeader = req.headers.get("x-admin-key") || "";
    if (!ADMIN_KEY || adminHeader !== ADMIN_KEY) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2) Read target lang from body
    const body = await req.json().catch(() => ({} as any));
    const targetLangRaw = (body?.languageCode || "").trim().toLowerCase();

    if (!targetLangRaw) {
      return NextResponse.json(
        { ok: false, error: "Missing languageCode in body" },
        { status: 400 }
      );
    }

    if (!isSupportedTargetLang(targetLangRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported target language '${targetLangRaw}'.`,
        },
        { status: 400 }
      );
    }

    const targetLang = targetLangRaw as TargetLangCode;
    const targetLabel = LANGUAGE_LABELS[targetLang];

    // 3) Load English base strings
    // Try DB first (language_code = 'en'); fallback to UI_STRINGS
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
      // Fallback: use UI_STRINGS as English master
      (Object.keys(UI_STRINGS) as UiTranslationKey[]).forEach((key) => {
        baseMap[key] = UI_STRINGS[key];
      });
    }

    const keys = Object.keys(baseMap);
    if (keys.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No English base strings found to translate.",
        },
        { status: 400 }
      );
    }

    // 4) Ask OpenAI to translate all strings in one JSON object
    const payload = baseMap; // { "nav.dashboard": "Dashboard", ... }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a professional app UI/localization translator. " +
          "You translate short UI labels, menu items, and descriptions. " +
          "You MUST keep JSON keys unchanged, only translate the text values.",
      },
      {
        role: "user",
        content:
          `Translate this JSON object of English UI strings into ${targetLabel}.\n` +
          `Keep the JSON keys exactly the same. Only translate the values.\n` +
          `Return ONLY valid JSON, no explanation.\n\n` +
          JSON.stringify(payload, null, 2),
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    let translated: Record<string, unknown> = {};

    try {
      translated = JSON.parse(content);
    } catch (err) {
      console.error("[ui-translation-sync] JSON parse error:", err, content);
      return NextResponse.json(
        { ok: false, error: "AI returned invalid JSON." },
        { status: 500 }
      );
    }

    // 5) Build rows for upsert
    const rows = keys.map((key) => {
      const raw = translated[key];
      const text =
        typeof raw === "string" && raw.trim().length > 0
          ? raw.trim()
          : baseMap[key]; // fallback to English if weird

      return {
        language_code: targetLang,
        key,
        text,
      };
    });

    // 6) Upsert into ui_translations
    const { error: upsertError } = await supabaseAdmin
      .from("ui_translations")
      .upsert(rows, {
        onConflict: "language_code,key",
      });

    if (upsertError) {
      console.error("[ui-translation-sync] upsert error:", upsertError);
      return NextResponse.json(
        {
          ok: false,
          error:
            upsertError.message ||
            upsertError.details ||
            "Failed to upsert translations",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode: targetLang,
        insertedOrUpdated: rows.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[ui-translation-sync] unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error while syncing UI translations.",
      },
      { status: 500 }
    );
  }
}
