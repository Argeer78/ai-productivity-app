// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await context.params;

    const raw = (lang || "en").trim();
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Missing language code" },
        { status: 400 }
      );
    }

    const code = raw.toLowerCase();
    const targetLang = code.split("-")[0] || "en"; // e.g. fr-FR -> fr

    // 1) Load EN base from DB, fallback to UI_STRINGS
    const { data: enRows, error: enError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", "en");

    const enMap: Record<string, string> = {};

    if (!enError && enRows && enRows.length > 0) {
      for (const row of enRows) {
        if (!row.key || typeof row.text !== "string") continue;
        enMap[row.key] = row.text;
      }
    } else {
      // fallback: nav + core keys from UI_STRINGS
      (Object.keys(UI_STRINGS) as UiTranslationKey[]).forEach((key) => {
        enMap[key] = UI_STRINGS[key];
      });
    }

    // 2) If we are asking for English, just return EN map
    if (targetLang === "en") {
      return NextResponse.json(
        {
          ok: true,
          languageCode: "en",
          translations: enMap,
        },
        { status: 200 }
      );
    }

    // 3) Load target language rows
    const { data: targetRows, error: targetError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", targetLang);

    const translations: Record<string, string> = { ...enMap }; // EN fallback

    if (targetError) {
      console.error("[ui-translations] target fetch error", targetError);
      // fall back to EN only, but still return ok
      return NextResponse.json(
        {
          ok: true,
          languageCode: "en",
          translations,
        },
        { status: 200 }
      );
    }

    if (targetRows && targetRows.length > 0) {
      for (const row of targetRows) {
        if (!row.key || typeof row.text !== "string") continue;
        // override EN fallback with target language
        translations[row.key] = row.text;
      }

      return NextResponse.json(
        {
          ok: true,
          languageCode: targetLang,
          translations,
        },
        { status: 200 }
      );
    }

    // 4) No rows for that language -> EN fallback
    return NextResponse.json(
      {
        ok: true,
        languageCode: "en",
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
