// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS } from "@/lib/uiStrings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await context.params;

    const codeRaw = (lang || "en").trim();
    if (!codeRaw) {
      return NextResponse.json(
        { ok: false, error: "Missing language code" },
        { status: 400 }
      );
    }

    const code = codeRaw.toLowerCase();
    const baseLang = code.split("-")[0]; // e.g. "fr-FR" -> "fr"
    const languageCode = baseLang || "en";

    // 1) Load *English* master keys from ui_translations if present
    const baseMap: Record<string, string> = {};

    const { data: enRows, error: enError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", "en");

    if (!enError && enRows && enRows.length > 0) {
      for (const row of enRows) {
        if (!row.key || typeof row.text !== "string") continue;
        baseMap[row.key] = row.text;
      }
    } else {
      // Fallback: use UI_STRINGS as minimal English base
      for (const [key, text] of Object.entries(UI_STRINGS)) {
        baseMap[key] = text as string;
      }
    }

    // Start with English as fallback
    const translations: Record<string, string> = { ...baseMap };

    // 2) If we’re requesting English, just return the master map
    if (languageCode === "en") {
      return NextResponse.json(
        {
          ok: true,
          languageCode: "en",
          translations,
        },
        { status: 200 }
      );
    }

    // 3) Load overrides for the requested language from ui_translations
    const { data: langRows, error: langError } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", languageCode);

    if (langError) {
      console.error("[ui-translations] lang fetch error", langError);
      // Still return English fallback so UI works
      return NextResponse.json(
        {
          ok: true,
          languageCode: "en",
          translations,
        },
        { status: 200 }
      );
    }

    if (langRows && langRows.length > 0) {
      for (const row of langRows) {
        if (!row.key || typeof row.text !== "string") continue;
        translations[row.key] = row.text;
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
