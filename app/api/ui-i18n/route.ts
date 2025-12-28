// app/api/ui-i18n/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS } from "@/lib/uiStrings";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langParam = (searchParams.get("lang") || "en").toLowerCase();

    const candidates = [langParam, langParam.split("-")[0]].filter(Boolean);

    let languageCodeUsed: string | null = null;
    let translationsFromDb: Record<string, string> = {};

    for (const code of candidates) {
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
        translationsFromDb = data.reduce<Record<string, string>>((acc, row) => {
          acc[row.key] = row.text;
          return acc;
        }, {});
        break;
      }
    }

    // If nothing in DB, still return local json strings
    if (!languageCodeUsed) {
      languageCodeUsed = "en";
      translationsFromDb = {};
    }

    /**
     * ✅ KEY FIX:
     * Return union of UI_STRINGS + DB keys.
     * DB should be allowed to introduce new keys (like notes.buttons.saveNote),
     * even if UI_STRINGS doesn't have them yet.
     *
     * Also: UI_STRINGS acts as fallback for missing DB values.
     */
    const merged: Record<string, string> = {
      ...UI_STRINGS,
      ...translationsFromDb,
    };

    // Ensure any UI_STRINGS missing due to weird DB values are still present
    for (const [k, v] of Object.entries(UI_STRINGS)) {
      if (typeof merged[k] !== "string" || merged[k] === "") merged[k] = v;
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
