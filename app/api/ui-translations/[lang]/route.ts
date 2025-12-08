// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    // NOTE: with your Next version, params is a Promise
    const { lang } = await context.params;

    const codeRaw = (lang || "en").trim();
    if (!codeRaw) {
      return NextResponse.json(
        { ok: false, error: "Missing language code" },
        { status: 400 }
      );
    }

    const code = codeRaw.toLowerCase();
    const baseLang = code.split("-")[0]; // e.g. "el-gr" -> "el"

    const languageCode = baseLang || "en";

    // 1) Start with English defaults from UI_STRINGS
    const base = UI_STRINGS; // this is your master EN map
    const translations: Record<string, string> = {};

    (Object.keys(base) as UiTranslationKey[]).forEach((key) => {
      translations[key] = base[key]; // default English
    });

    // 2) Load overrides from Supabase, if any
    const { data, error } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", languageCode);

    if (error) {
      console.error("[ui-translations] fetch error", error);
      // We still return English so the UI works
      return NextResponse.json(
        {
          ok: true,
          languageCode: "en",
          translations,
        },
        { status: 200 }
      );
    }

    if (data) {
      for (const row of data) {
        if (!row.key || typeof row.text !== "string") continue;
        // Only override keys we know about
        if (row.key in translations) {
          translations[row.key] = row.text;
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode,
        translations,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations] GET error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load UI translations",
      },
      { status: 500 }
    );
  }
}
