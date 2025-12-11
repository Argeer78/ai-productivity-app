// app/api/admin/ai-translate-namespace/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const ADMIN_KEY_HEADER = "X-Admin-Key";
const ADMIN_KEY_ENV = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Body = {
  fromLanguage?: string;   // e.g. "en"
  toLanguage?: string;     // e.g. "es"
  namespace?: string;      // e.g. "tools", "notes", "tasks"
};

export async function POST(req: NextRequest) {
  try {
    // ✅ Basic admin protection
    const adminKeyHeader = req.headers.get(ADMIN_KEY_HEADER);
    if (!ADMIN_KEY_ENV || adminKeyHeader !== ADMIN_KEY_ENV) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;
    const fromLanguage = (body.fromLanguage || "en").toLowerCase();
    const toLanguage = (body.toLanguage || "").toLowerCase();
    const namespace = (body.namespace || "").trim();

    if (!toLanguage) {
      return NextResponse.json(
        { ok: false, error: "Missing toLanguage" },
        { status: 400 }
      );
    }
    if (!namespace) {
      return NextResponse.json(
        { ok: false, error: "Missing namespace" },
        { status: 400 }
      );
    }

    if (fromLanguage === toLanguage) {
      return NextResponse.json(
        { ok: false, error: "fromLanguage and toLanguage are the same" },
        { status: 400 }
      );
    }

    // 1) Load all English strings for this namespace
    const { data: rows, error } = await supabaseAdmin
      .from("translations")
      .select("key, text")
      .eq("language_code", fromLanguage)
      .eq("namespace", namespace)
      .order("key");

    if (error) {
      console.error("[ai-translate-namespace] select error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load base translations" },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `No base translations found for namespace="${namespace}" and language="${fromLanguage}".`,
        },
        { status: 404 }
      );
    }

    // Build a simple object { key: englishText }
    const baseMap: Record<string, string> = {};
    for (const row of rows) {
      if (row.key && typeof row.text === "string") {
        baseMap[row.key] = row.text;
      }
    }

    // 2) Ask OpenAI to translate all keys in one shot
    const prompt = `
You are a professional app UI translator.

Translate the following UI strings from ${fromLanguage} to ${toLanguage}.

Return ONLY a valid JSON object with this shape:
{
  "key1": "translated text 1",
  "key2": "translated text 2",
  ...
}

Rules:
- Keep the keys EXACTLY the same.
- Preserve placeholders like {name}, {date}, {{count}} exactly.
- Do not add explanations or comments, only JSON.
Here are the strings:

${JSON.stringify(baseMap, null, 2)}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You translate software UI strings and return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content =
      completion.choices[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Empty AI response" },
        { status: 500 }
      );
    }

    let translatedMap: Record<string, string>;
    try {
      // Sometimes models wrap JSON in ```json ... ```; strip that if needed
      const jsonText = content.replace(/```json/gi, "").replace(/```/g, "");
      translatedMap = JSON.parse(jsonText);
    } catch (err) {
      console.error("[ai-translate-namespace] JSON parse error:", content);
      return NextResponse.json(
        { ok: false, error: "Failed to parse AI JSON. See server logs." },
        { status: 500 }
      );
    }

    // 3) Build rows for upsert
    const upsertRows = Object.entries(translatedMap).map(
      ([key, text]) => ({
        namespace,
        key,
        language_code: toLanguage,
        text,
      })
    );

    const { error: upsertError } = await supabaseAdmin
      .from("translations")
      .upsert(upsertRows, {
        onConflict: "namespace,key,language_code",
      });

    if (upsertError) {
      console.error("[ai-translate-namespace] upsert error:", upsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to upsert translated strings" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        namespace,
        fromLanguage,
        toLanguage,
        count: upsertRows.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ai-translate-namespace] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error in translation sync" },
      { status: 500 }
    );
  }
}
