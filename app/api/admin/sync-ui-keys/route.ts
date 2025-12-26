// app/api/admin/sync-ui-keys/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SUPPORTED_LANGS } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Body = {
  sourceLang?: string; // default "en"
  targetLangs?: string[]; // optional
};

const MODEL = "gpt-4.1-mini";
const MAX_BATCH_ITEMS = 20;

// IMPORTANT: pagination size for PostgREST
const PAGE_SIZE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllKeysForLang(lang: string): Promise<Set<string>> {
  const out = new Set<string>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabaseAdmin
      .from("ui_translations")
      .select("key")
      .eq("language_code", lang)
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    for (const r of rows as any[]) {
      if (r?.key) out.add(String(r.key));
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return out;
}

async function fetchAllSourceMap(lang: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", lang)
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    for (const r of rows as any[]) {
      if (!r?.key) continue;
      out.set(String(r.key), typeof r.text === "string" ? r.text : "");
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return out;
}

async function translateBatch(params: { texts: string[]; targetLang: string }): Promise<string[]> {
  const { texts, targetLang } = params;

  const prompt = [
    `Translate each item to ${targetLang}.`,
    `Return STRICT JSON only as: {"translations":["...","..."]}`,
    `Rules: preserve meaning, keep formatting, do not add commentary.`,
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
    response_format: { type: "json_object" },
    max_tokens: 1200,
  });

  const raw = completion.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(raw);
    const arr = parsed?.translations;
    if (!Array.isArray(arr)) throw new Error("Missing translations array");

    // Ensure 1:1 length
    if (arr.length !== texts.length) {
      return texts.map((_, i) => String(arr[i] ?? ""));
    }
    return arr.map((x: any) => String(x ?? ""));
  } catch {
    // fallback: keep originals if parsing fails
    return texts;
  }
}

export async function POST(req: Request) {
  try {
    // --- Admin auth ---
    const headerKey = req.headers.get("X-Admin-Key") || req.headers.get("x-admin-key") || "";
    if (!ADMIN_KEY || headerKey !== ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY missing on server." }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const sourceLang = String(body.sourceLang || "en").toLowerCase();

    const allSupported = (SUPPORTED_LANGS || [])
      .map((l: any) => String(l.code || "").toLowerCase())
      .filter(Boolean);

    const supported = allSupported.length ? allSupported : ["en"];

    const targets =
      (body.targetLangs?.map((x) => x.toLowerCase())?.filter(Boolean) as string[] | undefined) ||
      supported.filter((c) => c !== sourceLang);

    if (!targets.length) {
      return NextResponse.json(
        { ok: true, sourceLang, targetLangs: [], insertedTotal: 0, perLang: {} },
        { status: 200 }
      );
    }

    // 1) Load ALL source keys (no 1000-row truncation)
    const srcMap = await fetchAllSourceMap(sourceLang);

    if (srcMap.size === 0) {
      return NextResponse.json(
        { ok: false, error: `No source keys found for language '${sourceLang}'.` },
        { status: 400 }
      );
    }

    const srcKeys = Array.from(srcMap.keys());
    const perLang: Record<string, number> = {};
    let insertedTotal = 0;

    // 2) Process languages sequentially
    for (const lang of targets) {
      // Load ALL existing keys for this language (no 1000-row truncation)
      let existing: Set<string>;
      try {
        existing = await fetchAllKeysForLang(lang);
      } catch (e: any) {
        console.error(`[sync-ui-keys] existing load error ${lang}`, e?.message || e);
        perLang[lang] = 0;
        continue;
      }

      // Compute missing
      const missingKeys: string[] = [];
      for (const k of srcKeys) {
        if (!existing.has(k)) missingKeys.push(k);
      }

      // ✅ FAST PATH: nothing missing → return immediately for this lang
      if (missingKeys.length === 0) {
        perLang[lang] = 0;
        continue;
      }

      let insertedForLang = 0;
      const batches = chunk(missingKeys, MAX_BATCH_ITEMS);

      for (const b of batches) {
        const sourceTexts = b.map((k) => srcMap.get(k) || "");
        const translated = await translateBatch({ texts: sourceTexts, targetLang: lang });

        const rows = b.map((key, i) => ({
          key,
          language_code: lang,
          text: translated[i] ?? "",
        }));

        const { error: upErr } = await supabaseAdmin
          .from("ui_translations")
          .upsert(rows, { onConflict: "key,language_code", ignoreDuplicates: true });

        if (upErr) {
          console.error(`[sync-ui-keys] upsert error ${lang}`, upErr);
          continue; // best-effort
        }

        insertedForLang += rows.length;
      }

      perLang[lang] = insertedForLang;
      insertedTotal += insertedForLang;
    }

    return NextResponse.json(
      { ok: true, sourceLang, targetLangs: targets, insertedTotal, perLang },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[sync-ui-keys] fatal error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to sync keys." }, { status: 500 });
  }
}
