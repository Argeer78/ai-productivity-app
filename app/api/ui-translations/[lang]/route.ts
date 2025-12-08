// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, UiTranslationKey } from "@/lib/uiStrings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await context.params;
    const rawCode = (lang || "en").toLowerCase();

    // Handle lang like "el-GR" vs "el"
    const candidates = [
      rawCode,
      rawCode.split("-")[0], // base language
    ];

    // Try to load translations for the most specific code that exists
    let languageCodeUsed: string | null = null;
    let translationsFromDb: Record<string, string> = {};

    for (const code of candidates) {
      if (!code) continue;

      const { data, error } = await supabaseAdmin
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", code);

      if (error) {
        console.error("[ui-translations] fetch error", error, "for", code);
        continue;
      }

      if (data && data.length > 0) {
        languageCodeUsed = code;
        translationsFromDb = data.reduce<Record<string, string>>(
          (acc, row) => {
            acc[row.key] = row.text;
            return acc;
          },
          {}
        );
        break;
      }
    }

    // If nothing in DB, we fall back to English only.
    if (!languageCodeUsed) {
      languageCodeUsed = "en";
      translationsFromDb = {};
    }

    // Build final translations object:
    // every key in UI_STRINGS must have a value.
    const merged: Record<string, string> = {};
    const keys = Object.keys(UI_STRINGS) as UiTranslationKey[];

    for (const key of keys) {
      merged[key] = translationsFromDb[key] ?? UI_STRINGS[key];
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode: languageCodeUsed,
        translations: merged,
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
