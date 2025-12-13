// app/api/admin/sync-ui-keys/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SUPPORTED_LANGS } from "@/lib/i18n";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Body = {
  sourceLang?: string; // default "en"
  targetLangs?: string[]; // optional
};

const MAX_BATCH_ITEMS = 40; // keep it safe
const MODEL = "gpt-4.1-mini";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function translateBatch(params: {
  texts: string[];
  targetLang: string;
}): Promise<string[]> {
  const { texts, targetLang } = params;

  // We want a 1:1 array output. Force JSON output.
  const prompt = [
    `Translate each item to ${targetLang}.`,
    `Return STRICT JSON only as: {"translations":["...","..."]}`,
    `Rules: preserve meaning, keep formatting, do not add extra commentary.`,
    `Items:`,
    JSON.stringify(texts),
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: "You are a careful translation engine." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(raw);
    const arr = parsed?.translations;
    if (!Array.isArray(arr)) throw new Error("Missing translations array");
    // ensure length match
    if (arr.length !== texts.length) {
      // fallback: pad/trim
      const fixed = texts.map((_, i) => String(arr[i] ?? ""));
      return fixed;
    }
    return arr.map((x: any) => String(x ?? ""));
  } catch {
    // fallback: if model didn’t return JSON, just return originals (safe)
    return texts;
  }
}

export async function POST(req: Request) {
  try {
    // --- Admin auth (same pattern as your other admin endpoints) ---
    const headerKey = req.headers.get("X-Admin-Key") || "";
    if (!ADMIN_KEY || headerKey !== ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY missing on server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const sourceLang = (body.sourceLang || "en").toLowerCase();

    const allSupported = SUPPORTED_LANGS.map((l) => l.code.toLowerCase());
    const targets =
      (body.targetLangs?.map((x) => x.toLowerCase())?.filter(Boolean) as string[] | undefined) ||
      allSupported.filter((c) => c !== sourceLang);

    // Load all EN keys
    const { data: enRows, error: enErr } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", sourceLang);

    if (enErr) {
      console.error("[sync-ui-keys] EN load error", enErr);
      return NextResponse.json({ ok: false, error: "Failed to load EN keys." }, { status: 500 });
    }

    const enMap = new Map<string, string>();
    for (const r of enRows || []) {
      if (r?.key) enMap.set(r.key, r.text ?? "");
    }

    if (enMap.size === 0) {
      return NextResponse.json(
        { ok: false, error: `No source keys found for language '${sourceLang}'.` },
        { status: 400 }
      );
    }

    const perLang: Record<string, number> = {};
    let insertedTotal = 0;

    for (const lang of targets) {
      // Load existing keys for target language (only keys)
      const { data: existingRows, error: exErr } = await supabaseAdmin
        .from("ui_translations")
        .select("key")
        .eq("language_code", lang);

      if (exErr) {
        console.error(`[sync-ui-keys] existing load error ${lang}`, exErr);
        perLang[lang] = 0;
        continue;
      }

      const existing = new Set<string>((existingRows || []).map((r: any) => r.key).filter(Boolean));

      const missingKeys: string[] = [];
      for (const k of enMap.keys()) {
        if (!existing.has(k)) missingKeys.push(k);
      }

      if (missingKeys.length === 0) {
        perLang[lang] = 0;
        continue;
      }

      // translate missing in batches
      const batches = chunk(missingKeys, MAX_BATCH_ITEMS);

      const inserts: { key: string; language_code: string; text: string }[] = [];

      for (const b of batches) {
        const sourceTexts = b.map((k) => enMap.get(k) || "");
        const translated = await translateBatch({ texts: sourceTexts, targetLang: lang });

        for (let i = 0; i < b.length; i++) {
          inserts.push({
            key: b[i],
            language_code: lang,
            text: translated[i] ?? "",
          });
        }
      }

      // Insert only (no overwrite). If you already added a UNIQUE(key, language_code),
      // we can do upsert with ignoreDuplicates style by handling conflicts.
      // Supabase JS doesn't expose "ON CONFLICT DO NOTHING" directly,
      // but we can safely upsert and keep existing by only inserting missing.
      const { error: insErr } = await supabaseAdmin.from("ui_translations").insert(inserts);

      if (insErr) {
        console.error(`[sync-ui-keys] insert error ${lang}`, insErr);
        // If you *do* have a unique constraint and some race condition happens,
        // you might see duplicate errors; in that case we still report best-effort.
        perLang[lang] = 0;
        continue;
      }

      perLang[lang] = inserts.length;
      insertedTotal += inserts.length;
    }

    return NextResponse.json(
      {
        ok: true,
        sourceLang,
        targetLangs: targets,
        insertedTotal,
        perLang,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[sync-ui-keys] fatal error", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Failed to sync keys." },
      { status: 500 }
    );
  }
}
