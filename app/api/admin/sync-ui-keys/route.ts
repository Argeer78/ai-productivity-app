// app/api/admin/sync-ui-keys/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_EMAILS = ["sgouros2305@gmail.com"];

// Choose the languages you want to keep in sync
const TARGET_LANGS = [
  "el",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "tr",
  "ru",
  "uk",
  "pl",
  "ro",
  "bg",
  "sr",
  "hr",
  "hu",
  "cs",
  "sk",
  "sv",
  "da",
  "no",
  "fi",
  "ar",
  "he",
  "hi",
  "th",
  "vi",
  "id",
  "zh",
  "ja",
  "ko",
];

export async function POST(req: Request) {
  try {
    // ✅ Basic admin check (client will pass user email)
    const body = await req.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.toLowerCase();

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const sourceLang = (body?.sourceLang as string | undefined) || "en";
    const targetLangs: string[] =
      Array.isArray(body?.targetLangs) && body.targetLangs.length
        ? body.targetLangs
        : TARGET_LANGS;

    // 1) Load source keys (EN)
    const { data: sourceRows, error: srcErr } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", sourceLang);

    if (srcErr) throw srcErr;

    const sourceKeys = Array.from(
      new Set((sourceRows || []).map((r) => r.key).filter(Boolean))
    );

    if (sourceKeys.length === 0) {
      return NextResponse.json({
        ok: true,
        insertedTotal: 0,
        detail: "No source keys found in EN.",
      });
    }

    let insertedTotal = 0;
    const perLang: Record<string, number> = {};

    // 2) For each target language, insert only missing keys
    for (const lang of targetLangs) {
      if (!lang || lang === sourceLang) continue;

      const { data: existingRows, error: exErr } = await supabaseAdmin
        .from("ui_translations")
        .select("key")
        .eq("language_code", lang);

      if (exErr) throw exErr;

      const existing = new Set((existingRows || []).map((r) => r.key));

      const missingKeys = sourceKeys.filter((k) => !existing.has(k));
      if (missingKeys.length === 0) {
        perLang[lang] = 0;
        continue;
      }

      const inserts = missingKeys.map((k) => ({
        key: k,
        language_code: lang,
        text: null, // keep empty so translators / auto-translate can fill
      }));

      // Using insert. If you have the unique constraint, duplicates are prevented.
      // If you'd rather be extra safe, you can do upsert with ignore duplicates:
      const { error: insErr } = await supabaseAdmin
        .from("ui_translations")
        .upsert(inserts, { onConflict: "key,language_code", ignoreDuplicates: true });

      if (insErr) throw insErr;

      perLang[lang] = missingKeys.length;
      insertedTotal += missingKeys.length;
    }

    return NextResponse.json(
      { ok: true, insertedTotal, perLang },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[sync-ui-keys] error", err?.message || err);
    return NextResponse.json(
      { error: "Failed to sync keys." },
      { status: 500 }
    );
  }
}
