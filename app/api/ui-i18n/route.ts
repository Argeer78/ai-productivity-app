// app/api/ui-i18n/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, UiTranslationKey } from "@/lib/uiStrings";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langParam = (searchParams.get("lang") || "en").toLowerCase();

    const candidates = [langParam, langParam.split("-")[0]];

    let languageCodeUsed: string | null = null;
    let translationsFromDb: Record<string, string> = {};

    for (const code of candidates) {
      if (!code) continue;

      const { data, error } = await supabaseAdmin
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", code);

      if (error) {
        console.error("[ui-i18n] fetch error", error, "for", code);
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

    if (!languageCodeUsed) {
      languageCodeUsed = "en";
      translationsFromDb = {};
    }

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
    console.error("[ui-i18n] GET error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load UI translations",
      },
      { status: 500 }
    );
  }
}
