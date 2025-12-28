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

    // Optimized: Fetch both languages in one query to reduce latency
    // Using a large limit (5000) to grab everything in a single round-trip
    const { data: allRows, error } = await supabase
      .from("ui_translations")
      .select("key, text, language_code")
      .in("language_code", languageCode === "en" ? ["en"] : ["en", languageCode])
      .limit(5000);

    if (error) {
      console.error("[ui-translations] Fetch error:", error);
    }

    if (allRows) {
      // 1. First pass: Apply 'en' DB overrides on top of UI_STRINGS
      for (const row of allRows) {
        if (row.language_code === "en" && row.key && row.text) {
          translations[row.key] = row.text;
        }
      }

      // 2. Second pass: Apply target language overrides (if strictly not en)
      if (languageCode !== "en") {
        for (const row of allRows) {
          if (row.language_code === languageCode && row.key && typeof row.text === "string") {
            translations[row.key] = row.text;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      languageCode,
      translations,
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (err) {
    console.error("[ui-translations] GET error", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load UI translations" },
      { status: 500 }
    );
  }
}
