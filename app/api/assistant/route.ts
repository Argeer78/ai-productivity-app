// app/api/assistant/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

type IncomingMsg = {
  role: "user" | "assistant" | "system";
  content: unknown;
};

function safeLangCode(raw: unknown): string {
  if (typeof raw !== "string") return "en";
  const v = raw.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(v)) return "en";
  return v;
}

function languageNameForPrompt(code: string): string {
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

function fallbackAnswerForLang(code: string): string {
  const map: Record<string, string> = {
    en: "Sorry — I couldn’t generate a response.",
    el: "Συγγνώμη — δεν μπόρεσα να δημιουργήσω απάντηση.",
    es: "Lo siento: no pude generar una respuesta.",
    fr: "Désolé — je n’ai pas pu générer une réponse.",
    de: "Sorry — ich konnte keine Antwort erzeugen.",
    it: "Mi dispiace — non sono riuscito a generare una risposta.",
    pt: "Desculpe — não consegui gerar uma resposta.",
    "pt-br": "Desculpe — não consegui gerar uma resposta.",
  };
  return map[code] || map.en;
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

// ✅ Athens-consistent YYYY-MM-DD
function getTodayAthensYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const yyyy = parts.find((p) => p.type === "year")?.value || "0000";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  return `${yyyy}-${mm}-${dd}`;
}

async function checkAndIncrementAiUsage(userId: string) {
  const today = getTodayAthensYmd();

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("plan, email")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) console.error("[assistant] profile load error", profErr);

  const plan = (profile?.plan as "free" | "pro" | "founder") || "free";
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = adminEmail && profile?.email && profile.email === adminEmail;
  const isPro = plan === "pro" || plan === "founder" || isAdmin;
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

  const { data: usage, error: usageErr } = await supabaseAdmin
    .from("ai_usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageErr && (usageErr as any).code !== "PGRST116") {
    console.error("[assistant] ai_usage select error", usageErr);
    throw new Error("Could not check AI usage.");
  }

  const current = usage?.count || 0;

  if (!isPro && current >= dailyLimit) {
    return {
      ok: false as const,
      status: 429 as const,
      plan,
      dailyLimit,
      usedToday: current,
    };
  }

  if (!usage) {
    const { error: insErr } = await supabaseAdmin
      .from("ai_usage")
      .insert([{ user_id: userId, usage_date: today, count: 1 }]);
    if (insErr) {
      console.error("[assistant] ai_usage insert error", insErr);
      throw new Error("Failed to update AI usage.");
    }
    return { ok: true as const, plan, dailyLimit, usedToday: 1 };
  }

  const next = current + 1;
  const { error: updErr } = await supabaseAdmin
    .from("ai_usage")
    .update({ count: next })
    .eq("id", usage.id);

  if (updErr) {
    console.error("[assistant] ai_usage update error", updErr);
    throw new Error("Failed to update AI usage.");
  }

  return { ok: true as const, plan, dailyLimit, usedToday: next };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Assistant: OPENAI_API_KEY missing");
      return NextResponse.json({ error: "AI is not configured on this server." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const rawMessages = body?.messages;
    const userId = body?.userId as string | undefined;

    const uiLang = safeLangCode(body?.uiLang);
    const langName = languageNameForPrompt(uiLang);

    const messages = sanitizeMessages(rawMessages);
    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages." }, { status: 400 });
    }

    // ✅ Enforce + increment usage (counts assistant calls)
    if (userId) {
      const usage = await checkAndIncrementAiUsage(userId);
      if (!usage.ok) {
        return NextResponse.json(
          {
            error: "Daily AI limit reached.",
            plan: usage.plan,
            dailyLimit: usage.dailyLimit,
            usedToday: usage.usedToday,
          },
          { status: usage.status }
        );
      }
    }

    const system = {
      role: "system" as const,
      content:
        `You are the in-app assistant for AI Productivity Hub.\n` +
        `Default response language: ${langName} (${uiLang}).\n` +
        `If the user clearly writes in another language, reply in that language.\n` +
        `Be concise and actionable. Use bullet points when helpful.`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [system, ...messages],
      temperature: 0.4,
    });

    const answer = completion.choices?.[0]?.message?.content || fallbackAnswerForLang(uiLang);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: any) {
    console.error("Assistant API error:", err?.message || err);
    return NextResponse.json({ error: "AI error on the server." }, { status: 500 });
  }
}
