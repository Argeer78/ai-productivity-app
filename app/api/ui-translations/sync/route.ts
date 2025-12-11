// app/api/ui-translations/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export async function POST(req: NextRequest) {
  try {
    // Optional admin protection
    if (ADMIN_KEY) {
      const headerKey =
        req.headers.get("x-admin-key") || req.headers.get("X-Admin-Key");
      if (headerKey !== ADMIN_KEY) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized (bad admin key)" },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => null as any);
    const rawLang = (body?.languageCode || "").toString().trim();

    if (!rawLang) {
      return NextResponse.json(
        { ok: false, error: "Missing languageCode in body" },
        { status: 400 }
      );
    }

    // normalize like "es-ES" -> "es"
    const languageCode = rawLang.toLowerCase().split("-")[0];

    // All keys from UI_STRINGS
    const entries = Object.entries(UI_STRINGS) as [UiTranslationKey, string][];

    // 1) Load existing keys for that language
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", languageCode);

    if (existingError) {
      console.error("[ui-translations/sync] existingError", existingError);
      return NextResponse.json(
        { ok: false, error: "Failed to load existing translations" },
        { status: 500 }
      );
    }

    const existingKeys = new Set(
      (existingRows || []).map((row: any) => row.key as string)
    );

    const toInsert: { language_code: string; key: string; text: string }[] = [];
    const toUpdate: { language_code: string; key: string; text: string }[] = [];

    for (const [key, text] of entries) {
      if (existingKeys.has(key)) {
        toUpdate.push({
          language_code: languageCode,
          key,
          text,
        });
      } else {
        toInsert.push({
          language_code: languageCode,
          key,
          text,
        });
      }
    }

    let inserted = 0;
    let updated = 0;

    // 2) Insert missing rows
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("ui_translations")
        .insert(toInsert);

      if (insertError) {
        console.error("[ui-translations/sync] insertError", insertError);
        return NextResponse.json(
          { ok: false, error: "Failed to insert new translation rows" },
          { status: 500 }
        );
      }
      inserted = toInsert.length;
    }

    // 3) Update existing rows
    // (update one-by-one to keep it simple & safe – admin-only, runs rarely)
    for (const row of toUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("ui_translations")
        .update({ text: row.text })
        .eq("language_code", languageCode)
        .eq("key", row.key);

      if (updateError) {
        console.error(
          "[ui-translations/sync] updateError for key",
          row.key,
          updateError
        );
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to update key "${row.key}"`,
          },
          { status: 500 }
        );
      }
      updated += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode,
        inserted,
        updated,
        totalKeys: entries.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations/sync] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error while syncing UI translations.",
      },
      { status: 500 }
    );
  }
}
