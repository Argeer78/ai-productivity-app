// app/api/assistant/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type IncomingMsg = {
  role: "user" | "assistant" | "system";
  content: unknown;
};

function safeLangCode(raw: unknown): string {
  if (typeof raw !== "string") return "en";
  // keep it simple & safe: "en", "el", "pt", "pt-br", etc.
  const v = raw.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(v)) return "en";
  return v;
}

function languageNameForPrompt(code: string): string {
  // Small mapping so the system instruction is human-friendly.
  // Anything unknown falls back to the code itself.
  const map: Record<string, string> = {
    en: "English",
    el: "Greek",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    "pt-br": "Brazilian Portuguese",
    nl: "Dutch",
    tr: "Turkish",
    ru: "Russian",
    uk: "Ukrainian",
    pl: "Polish",
    ro: "Romanian",
    bg: "Bulgarian",
    sr: "Serbian",
    hr: "Croatian",
    hu: "Hungarian",
    cs: "Czech",
    sk: "Slovak",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    ar: "Arabic",
    he: "Hebrew",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
  };
  return map[code] || code;
}

function sanitizeMessages(raw: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { role: "user" | "assistant"; content: string }[] = [];

  for (const m of raw as IncomingMsg[]) {
    if (!m || typeof m !== "object") continue;
    const role = (m as any).role;
    if (role !== "user" && role !== "assistant") continue;
    const content = (m as any).content;
    if (typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }

  return out;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Assistant: OPENAI_API_KEY missing");
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawMessages = body?.messages;
    const userId = body?.userId as string | undefined;

    // ✅ language hint coming from client (LanguageProvider)
    const uiLang = safeLangCode(body?.uiLang);
    const langName = languageNameForPrompt(uiLang);

    const messages = sanitizeMessages(rawMessages);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages." }, { status: 400 });
    }

    // Optional: record a usage tick (best effort, ignore errors)
    if (userId) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabaseAdmin
          .from("ai_usage")
          .select("id, count")
          .eq("user_id", userId)
          .eq("usage_date", today)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Assistant: ai_usage select error", error);
        } else if (!data) {
          const { error: insErr } = await supabaseAdmin
            .from("ai_usage")
            .insert([{ user_id: userId, usage_date: today, count: 1 }]);
          if (insErr) console.error("Assistant: ai_usage insert error", insErr);
        } else {
          const newCount = (data.count || 0) + 1;
          const { error: updErr } = await supabaseAdmin
            .from("ai_usage")
            .update({ count: newCount })
            .eq("id", data.id);
          if (updErr) console.error("Assistant: ai_usage update error", updErr);
        }
      } catch (err) {
        console.error("Assistant: ai_usage wrapper error", err);
      }
    }

    // ✅ System instruction to enforce reply language
    // Rule: reply in UI language by default; if user writes in another language, follow the user's language.
    const system = {
      role: "system" as const,
      content:
        `You are the in-app assistant for AI Productivity Hub.\n` +
        `Default response language: ${langName} (${uiLang}).\n` +
        `If the user writes in a different language, reply in the user's language.\n` +
        `Be concise and helpful. Use bullet points when it improves clarity.`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [system, ...messages],
      temperature: 0.4,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a response.";

    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: any) {
    console.error("Assistant API error:", err?.message || err);
    return NextResponse.json({ error: "AI error on the server." }, { status: 500 });
  }
}
