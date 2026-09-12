// app/api/ui-translations/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, type UiTranslationKey } from "@/lib/uiStrings";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const authError = adminAuthErrorResponse(admin);
    if (authError) return authError;

    const parsedBody = await parseJsonBody(req, z.object({ languageCode: z.string().min(2).max(16) }).strict(), REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const rawLang = parsedBody.data.languageCode.trim();

    // normalize like "en-US" -> "en"
    const languageCode = rawLang.toLowerCase().split("-")[0];

    // 🚫 This endpoint is ONLY for seeding English from UI_STRINGS.
    if (languageCode !== "en") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This endpoint only seeds English (en) from UI_STRINGS. " +
            "Use /api/admin/ui-translation-sync to generate other languages.",
        },
        { status: 400 }
      );
    }

    // All keys from UI_STRINGS
    const entries = Object.entries(UI_STRINGS) as [UiTranslationKey, string][];

    // 1) Load existing EN keys
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", "en");

    if (existingError) {
      console.error("[ui-translations/sync] existingError", existingError);
      return NextResponse.json(
        { ok: false, error: "Failed to load existing EN translations" },
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
          language_code: "en",
          key,
          text,
        });
      } else {
        toInsert.push({
          language_code: "en",
          key,
          text,
        });
      }
    }

    let inserted = 0;
    let updated = 0;

    // 2) Insert missing EN rows
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("ui_translations")
        .insert(toInsert);

      if (insertError) {
        console.error("[ui-translations/sync] insertError", insertError);
        return NextResponse.json(
          { ok: false, error: "Failed to insert new EN translation rows" },
          { status: 500 }
        );
      }
      inserted = toInsert.length;
    }

    // 3) Update existing EN rows from UI_STRINGS (rare, but useful if you edit copy)
    for (const row of toUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("ui_translations")
        .update({ text: row.text })
        .eq("language_code", "en")
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
            error: `Failed to update EN key "${row.key}"`,
          },
          { status: 500 }
        );
      }
      updated += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        languageCode: "en",
        inserted,
        updated,
        totalKeys: entries.length,
        note:
          "Only English was synced. For other languages, use /api/admin/ui-translation-sync.",
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
