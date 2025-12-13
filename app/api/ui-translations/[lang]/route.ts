// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UI_STRINGS } from "@/lib/uiStrings";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeLang(raw: string | undefined | null) {
  const s = (raw || "en").toString().trim().toLowerCase();
  return s.split("-")[0] || "en";
}

function getServerSupabase() {
  // Prefer service role if available (server-only)
  const admin = getSupabaseAdmin();
  if (admin) return admin;

  // Fallback to anon client (requires SELECT policy on ui_translations)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url || !anon) return null;

  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await context.params;
    const languageCode = normalizeLang(lang);

    const supabase = getServerSupabase();

    // Always start with UI_STRINGS as a minimal fallback
    const translations: Record<string, string> = { ...UI_STRINGS };

    if (!supabase) {
      // If no supabase client is available, return fallback only
      return NextResponse.json(
        { ok: true, languageCode: "en", translations },
        { status: 200 }
      );
    }

    // 1) Load EN base (so missing keys in lang still work)
    const { data: enRows, error: enErr } = await supabase
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", "en");

    if (enErr) {
      console.error("[ui-translations] EN fetch error", enErr);
    } else {
      for (const row of enRows || []) {
        if (!row?.key || typeof row.text !== "string") continue;
        translations[row.key] = row.text; // ✅ no filtering
      }
    }

    // 2) Overlay requested language (unless it's EN)
    if (languageCode !== "en") {
      const { data: langRows, error: langErr } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", languageCode);

      if (langErr) {
        console.error("[ui-translations] lang fetch error", langErr);
        // still return EN merged fallback
        return NextResponse.json(
          { ok: true, languageCode: "en", translations },
          { status: 200 }
        );
      }

      for (const row of langRows || []) {
        if (!row?.key || typeof row.text !== "string") continue;
        translations[row.key] = row.text; // ✅ no filtering
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
