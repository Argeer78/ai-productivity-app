// app/api/ui-translations/sync/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UI_STRINGS, UiTranslationKey } from "@/lib/uiStrings";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SEPARATOR = "\n\n----\n\n";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || process.env.CRON_SECRET || "";

export async function POST(req: Request) {
  try {
    if (!ADMIN_KEY) {
      console.error("[ui-translations/sync] ADMIN_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Admin key not configured" },
        { status: 500 }
      );
    }

    const headerKey = req.headers.get("x-admin-key") || "";
    if (headerKey !== ADMIN_KEY) {
      console.warn("[ui-translations/sync] Unauthorized access");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { languageCode?: string }
      | null;

    const languageCode = body?.languageCode?.trim().toLowerCase();
    if (!languageCode) {
      return NextResponse.json(
        { ok: false, error: "Missing languageCode" },
        { status: 400 }
      );
    }

    // Get all keys we care about
    const keys = Object.keys(UI_STRINGS) as UiTranslationKey[];

    // Check which ones already exist
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", languageCode);

    if (existingErr) {
      console.error("[ui-translations] fetch existing error", existingErr);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch existing translations" },
        { status: 500 }
      );
    }

    const existingKeys = new Set((existing || []).map((row) => row.key));
    const missingKeys = keys.filter((k) => !existingKeys.has(k));

    if (missingKeys.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          message: "No missing keys for this language",
          created: 0,
        },
        { status: 200 }
      );
    }

    // Join all English texts into one prompt
    const toTranslate = missingKeys.map((k) => UI_STRINGS[k]).join(SEPARATOR);

    const systemPrompt = `
You are translating the user interface of a productivity web app (notes, tasks, planner, weekly reports).

Goals:
- Sound like a native speaker in the target language (${languageCode}).
- Prefer concise, natural UI labels over literal translations.
- Maintain the app's friendly but professional tone.
- Do NOT translate variable placeholders like {name}, {date}, {count}.
- Preserve punctuation and emojis where they add meaning.
- Keep capitalization consistent with common UI conventions in the target language.

You will receive multiple UI strings concatenated together.
Each original snippet is separated by the line:
${SEPARATOR}
Return the translations in the exact same order, using the same separator line.
Do NOT add numbering, quotes, bullet points, or extra commentary.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: toTranslate },
      ],
    });

    const raw =
      completion.choices[0]?.message?.content?.trim() || "";

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "OpenAI returned an empty translation" },
        { status: 500 }
      );
    }

    const parts = raw.split(SEPARATOR).map((p) => p.trim());

    if (parts.length !== missingKeys.length) {
      console.warn(
        "[ui-translations] mismatch parts vs keys",
        parts.length,
        missingKeys.length
      );
    }

    const rows = missingKeys.map((key, idx) => ({
      key,
      language_code: languageCode,
      text: parts[idx] || UI_STRINGS[key], // fallback to English if mismatch
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("ui_translations")
      .upsert(rows, { onConflict: "key,language_code" });

    if (insertErr) {
      console.error("[ui-translations] upsert error", insertErr);
      return NextResponse.json(
        { ok: false, error: "Failed to save translations" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        created: rows.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations] sync route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
