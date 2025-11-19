// app/api/ui-translations/[lang]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  context: { params: { lang: string } }
) {
  try {
    const lang = context.params.lang?.toLowerCase();
    if (!lang) {
      return NextResponse.json(
        { ok: false, error: "Missing lang param" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", lang);

    if (error) {
      console.error("[ui-translations] get error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load translations" },
        { status: 500 }
      );
    }

    const map: Record<string, string> = {};
    for (const row of data || []) {
      map[row.key] = row.text;
    }

    return NextResponse.json(
      { ok: true, languageCode: lang, translations: map },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations] get route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
