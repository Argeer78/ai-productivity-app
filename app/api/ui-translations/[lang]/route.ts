// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await context.params;

    const codeRaw = (lang || "en").trim();
    const languageCode = (codeRaw.toLowerCase().split("-")[0] || "en");

    // 1) Start with English defaults
    const translations: Record<string, string> = {};
    (Object.keys(UI_STRINGS) as UiTranslationKey[]).forEach((k) => {
      translations[k] = UI_STRINGS[k];
    });

    // 2) Load overrides from Supabase (if admin available)
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      // fall back to English
      return NextResponse.json(
        { ok: true, languageCode: "en", translations },
        { status: 200 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", languageCode);

    if (error) {
      console.error("[ui-translations] fetch error", error);
      return NextResponse.json(
        { ok: true, languageCode: "en", translations },
        { status: 200 }
      );
    }

    if (data) {
      for (const row of data) {
        if (!row.key || typeof row.text !== "string") continue;
        if (row.key in translations) {
          translations[row.key] = row.text;
        }
      }
    }

    return NextResponse.json(
      { ok: true, languageCode, translations },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations] GET error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load UI translations" },
      { status: 500 }
    );
  }
}
