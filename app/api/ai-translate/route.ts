// app/api/ai-translate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

async function checkAndIncrementAiUsage(userId: string) {
  const today = getTodayString();

  // plan
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("plan, email")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[ai-translate] profile load error", profileErr);
    // default to free if profile fails
  }

  const plan = (profile?.plan as "free" | "pro" | "founder") || "free";
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = adminEmail && profile?.email && profile.email === adminEmail;
  const isPro = plan === "pro" || plan === "founder" || isAdmin;
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // usage row
  const { data: usage, error: usageError } = await supabaseAdmin
    .from("ai_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageError && (usageError as any).code !== "PGRST116") {
    console.error("[ai-translate] usage check error", usageError);
    throw new Error("Could not check AI usage.");
  }

  const current = usage?.count || 0;

  if (!isPro && current >= dailyLimit) {
    const err = new Error("Daily AI limit reached.");
    (err as any).status = 429;
    (err as any).plan = plan;
    (err as any).dailyLimit = dailyLimit;
    (err as any).usedToday = current;
    throw err;
  }

  // increment
  if (!usage) {
    const { error: insErr } = await supabaseAdmin
      .from("ai_usage")
      .insert([{ user_id: userId, usage_date: today, count: 1 }]);

    if (insErr) {
      console.error("[ai-translate] usage insert error", insErr);
      throw new Error("Failed to update AI usage.");
    }

    return { plan, dailyLimit, usedToday: 1 };
  } else {
    const next = current + 1;
    const { error: updErr } = await supabaseAdmin
      .from("ai_usage")
      .update({ count: next })
      .eq("id", usage.id);

    if (updErr) {
      console.error("[ai-translate] usage update error", updErr);
      throw new Error("Failed to update AI usage.");
    }

    return { plan, dailyLimit, usedToday: next };
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Body = {
  text: string | string[];
  targetLang: string;
  userId?: string | null;
};

// table: page_translations
// id, language_code, original_text, translated_text, created_at
type TranslationRow = {
  language_code: string;
  original_text: string;
  translated_text: string;
};

// Normalize text so cache keys match between client and server
function normalizeForCache(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { text, targetLang } = body || {};

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Missing text or targetLang" },
        { status: 400 }
      );
    }

    const isArrayInput = Array.isArray(text);
    const textsRaw: string[] = isArrayInput
      ? (text as string[])
      : [String(text)];
    const texts: string[] = textsRaw.map((t) => String(t));

    const totalChars = texts.reduce((sum, t) => sum + (t?.length || 0), 0);
    if (totalChars > 50000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const langCode = targetLang.toLowerCase();

    // If user explicitly asks for English, just echo (no cost)
    if (langCode === "en" || langCode === "en-us" || langCode === "en-gb") {
      return NextResponse.json({
        translation: isArrayInput ? texts : texts[0],
      });
    }

    // Normalize everything for cache + DB
    const textsNorm = texts.map((t) => normalizeForCache(t || ""));

    // 1) Look up cached translations
    const uniqueTexts = Array.from(new Set(textsNorm.filter(Boolean)));

    const cachedMap = new Map<string, string>();

    if (uniqueTexts.length > 0) {
      const { data: cached, error: cachedErr } = await supabase
        .from("page_translations")
        .select("language_code, original_text, translated_text")
        .eq("language_code", langCode)
        .in("original_text", uniqueTexts);

      if (cachedErr) {
        console.error("[ai-translate] Supabase select error", cachedErr);
      } else if (cached) {
        for (const row of cached as TranslationRow[]) {
          const original = normalizeForCache(row.original_text || "");
          const translated = (row.translated_text || "").trim();
          if (!original || !translated) continue;
          if (original === translated) continue; // ignore bad rows
          cachedMap.set(original, translated);
        }
      }
    }

    const results: (string | null)[] = new Array(textsNorm.length).fill(null);
    const toTranslate: { index: number; originalNorm: string }[] = [];

    textsNorm.forEach((snippetNorm, index) => {
      const originalNorm = snippetNorm;
      if (!originalNorm) {
        results[index] = "";
        return;
      }

      const cached = cachedMap.get(originalNorm);
      if (cached) {
        results[index] = cached;
      } else {
        toTranslate.push({ index, originalNorm });
      }
    });

    // 2) Call OpenAI only for missing snippets
    if (toTranslate.length > 0) {
      // ✅ Count an AI call only when we actually call OpenAI (cache miss)
      if (body?.userId) {
        await checkAndIncrementAiUsage(body.userId);
      }

      const originals = toTranslate.map((x) => x.originalNorm);
      const translated = await translateWithOpenAI(originals, langCode);

      const rowsToInsert: TranslationRow[] = [];

      toTranslate.forEach((item, i) => {
        const newText = (translated[i] ?? item.originalNorm).trim();
        results[item.index] = newText;

        // Save only real translations
        if (newText && newText !== item.originalNorm) {
          rowsToInsert.push({
            language_code: langCode,
            original_text: item.originalNorm,
            translated_text: newText,
          });
        }
      });

      if (rowsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from("page_translations")
          // simple insert – no onConflict required
          .insert(rowsToInsert);

        if (insertErr) {
          console.error("[ai-translate] Supabase insert error", insertErr);
        }
      }
    }

    const final = results.map((r, i) => r ?? texts[i]);

    return NextResponse.json({
      translation: isArrayInput ? final : final[0],
    });
  } catch (err: any) {
    console.error("[ai-translate] fatal error", err);

    const status = err?.status === 429 ? 429 : 500;

    if (status === 429) {
      return NextResponse.json(
        { error: err?.message || "Daily AI limit reached." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Internal error while translating." },
      { status: 500 }
    );
  }
}

async function translateWithOpenAI(
  snippets: string[],
  targetLang: string
): Promise<string[]> {
  if (snippets.length === 0) return [];

  const prompt = `
You are a translation engine.

- Translate EACH item in the JSON array into ${targetLang}.
- Keep markdown, emojis and formatting as much as possible.
- Do NOT add numbering, explanations or extra text.
- Your entire response MUST be a valid JSON array of strings, same length and order as the input.

Input JSON array:
${JSON.stringify(snippets)}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v, i) =>
        typeof v === "string" ? v : snippets[i] ?? ""
      );
    }
  } catch (e) {
    console.error("[ai-translate] JSON parse error, using originals", e);
  }

  return snippets;
}
