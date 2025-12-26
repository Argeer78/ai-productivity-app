import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SUPPORTED_LANGS } from "@/lib/i18n";

// ✅ Increase function max duration (Vercel/Next App Router)
export const runtime = "nodejs";
export const maxDuration = 300; // seconds (adjust if your plan supports it)
export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Body = {
  sourceLang?: string; // default "en"
  targetLangs?: string[]; // optional
};

// Keep batches small to reduce model latency + avoid big payloads
const MAX_BATCH_ITEMS = 20;
const MODEL = "gpt-4.1-mini";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function translateBatch(params: { texts: string[]; targetLang: string }): Promise<string[]> {
  const { texts, targetLang } = params;

  // Force 1:1 JSON array output
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
    // ✅ Helps a lot with reliability
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
    // Safe fallback: keep originals if parsing fails
    return texts;
  }
}

export async function POST(req: Request) {
  try {
    // --- Admin auth ---
    const headerKey = req.headers.get("X-Admin-Key") || "";
    if (!ADMIN_KEY || headerKey !== ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY missing on server." }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const sourceLang = (body.sourceLang || "en").toLowerCase();

    const allSupported = (SUPPORTED_LANGS || [])
      .map((l: any) => String(l.code || "").toLowerCase())
      .filter(Boolean);

    // Fallback safety if SUPPORTED_LANGS is misconfigured
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

    // Load all source keys
    const { data: srcRows, error: srcErr } = await supabaseAdmin
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", sourceLang);

    if (srcErr) {
      console.error("[sync-ui-keys] source load error", srcErr);
      return NextResponse.json({ ok: false, error: "Failed to load source keys." }, { status: 500 });
    }

    const srcMap = new Map<string, string>();
    for (const r of srcRows || []) {
      if (r?.key) srcMap.set(r.key, r.text ?? "");
    }

    if (srcMap.size === 0) {
      return NextResponse.json(
        { ok: false, error: `No source keys found for language '${sourceLang}'.` },
        { status: 400 }
      );
    }

    const perLang: Record<string, number> = {};
    let insertedTotal = 0;

    // ✅ Process languages sequentially (less rate-limit pain)
    for (const lang of targets) {
      const start = Date.now();
      console.log(`Processing language: ${lang}`);
      
      // Load existing keys for this language
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
      for (const k of srcMap.keys()) {
        if (!existing.has(k)) missingKeys.push(k);
      }

      // If no missing keys, skip this language
      if (missingKeys.length === 0) {
        console.log(`No missing keys for ${lang}`);
        perLang[lang] = 0;
        continue;
      }

      let insertedForLang = 0;
      const batches = chunk(missingKeys, MAX_BATCH_ITEMS);

      // ✅ Insert per batch so timeouts still leave progress
      for (const b of batches) {
        const sourceTexts = b.map((k) => srcMap.get(k) || "");
        const translated = await translateBatch({ texts: sourceTexts, targetLang: lang });

        const rows = b.map((key, i) => ({
          key,
          language_code: lang,
          text: translated[i] ?? "",
        }));

        // ✅ Critical with your unique index:
        const { error: upErr } = await supabaseAdmin
          .from("ui_translations")
          .upsert(rows, { onConflict: "key,language_code", ignoreDuplicates: true });

        if (upErr) {
          console.error(`[sync-ui-keys] upsert error ${lang}`, upErr);
          // keep going best-effort
          continue;
        }

        insertedForLang += rows.length;
      }

      perLang[lang] = insertedForLang;
      insertedTotal += insertedForLang;

      const end = Date.now();
      console.log(`Processed ${lang} in ${end - start}ms`);
    }

    return NextResponse.json(
      { ok: true, sourceLang, targetLangs: targets, insertedTotal, perLang },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[sync-ui-keys] fatal error:", err);
    return NextResponse.json({ ok: false, error: "Failed to sync keys." }, { status: 500 });
  }
}
