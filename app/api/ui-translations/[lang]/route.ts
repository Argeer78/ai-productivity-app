// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UI_STRINGS } from "@/lib/uiStrings";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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
    console.log("[API DEBUG] Language:", languageCode, "Supabase Client:", !!supabase);

    // Always start with UI_STRINGS as a minimal fallback
    const translations: Record<string, string> = { ...UI_STRINGS };

    if (!supabase) {
      console.log("[API DEBUG] No Supabase client.");
      // If no supabase client is available, return fallback only
      return NextResponse.json(
        { ok: true, languageCode: "en", translations },
        { status: 200 }
      );
    }

    else {
      // Verify if it's admin or anon (can't easily check instance, but can check if it fails like anon)
      console.log("[API DEBUG] Client acquired.");
    }

    // Helper to fetch all rows with pagination
    const fetchAll = async (lang: string) => {
      let allRows: { key: string; text: string }[] = [];
      let page = 0;
      const size = 1000;
      while (true) {
        // .range() is inclusive: 0..999, 1000..1999
        const { data, error } = await supabase
          .from("ui_translations")
          .select("key, text")
          .eq("language_code", lang)
          .range(page * size, (page + 1) * size - 1);

        if (error) {
          console.error(`[ui-translations] ${lang} fetch error (page ${page})`, error);
          break;
        }
        if (!data?.length) break;

        // Type assertion to ensure we match the expected shape (though select handles it)
        // @ts-ignore
        allRows = allRows.concat(data);

        if (data.length < size) break;
        page++;
      }
      return allRows;
    };

    // 1) Load EN base
    const enRows = await fetchAll("en");
    for (const row of enRows) {
      if (!row?.key || typeof row.text !== "string") continue;
      translations[row.key] = row.text;
    }

    // 2) Overlay requested language
    if (languageCode !== "en") {
      const langRows = await fetchAll(languageCode);
      for (const row of langRows) {
        if (!row?.key || typeof row.text !== "string") continue;
        translations[row.key] = row.text;
      }
    }

    return NextResponse.json({
      ok: true,
      languageCode,
      translations,
    }, { status: 200 });
  } catch (err) {
    console.error("[ui-translations] GET error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load UI translations" },
      { status: 500 }
    );
  }
}
