import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiLanguageInstruction } from "@/lib/aiLanguage";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

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

function normalizeLang(code?: string | null) {
  return String(code || "en").trim().toLowerCase().split("-")[0] || "en";
}

function buildToneDescription(aiTone?: string | null) {
  switch (aiTone) {
    case "friendly":
      return "Use a warm, friendly, and encouraging tone.";
    case "direct":
      return "Be concise, straightforward, and to the point. Avoid fluff.";
    case "motivational":
      return "Be energetic and motivational, but still practical.";
    case "casual":
      return "Use a relaxed, casual tone, like chatting with a friend.";
    case "balanced":
    default:
      return "Use a balanced, clear, and professional but approachable tone.";
  }
}

// Prevent prompts becoming huge
function clip(s: string, max = 280) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string | null };
    const userId = body.userId || null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in to use AI summary." },
        { status: 401 }
      );
    }

    const today = getTodayAthensYmd();

    // Load profile (plan + tone + focus + language)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, ai_tone, focus_area, ui_language, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[ai-summary] profile error", profileError);
    }

    const planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAdmin = adminEmail && profile?.email && profile.email === adminEmail;
    const isPro = planRaw === "pro" || planRaw === "founder" || isAdmin;
    const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const toneDescription = buildToneDescription(profile?.ai_tone);
    const focusArea = profile?.focus_area ? String(profile.focus_area) : null;

    const languageCode = normalizeLang(profile?.ui_language);
    const languageInstruction = aiLanguageInstruction(languageCode);

    // Read usage
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && (usageError as any).code !== "PGRST116") {
      console.error("[ai-summary] usage select error", usageError);
      return NextResponse.json({ ok: false, error: "Could not check your AI usage." }, { status: 500 });
    }

    const currentCount = usage?.count || 0;

    if (!isPro && currentCount >= dailyLimit) {
      return NextResponse.json(
        {
          ok: false,
          error: "You’ve reached today’s AI limit. Try again tomorrow or upgrade.",
          plan: planRaw,
          dailyLimit,
        },
        { status: 429 }
      );
    }

    // Notes + tasks (keep prompt small but meaningful)
    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("title, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (notesErr) console.error("[ai-summary] notes load error", notesErr);

    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("title, description, is_done, due_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (tasksErr) console.error("[ai-summary] tasks load error", tasksErr);

    const notesText =
      (notes || [])
        .map((n: any, i: number) => {
          const title = n?.title ? clip(String(n.title), 80) : "(untitled)";
          const content = n?.content ? clip(String(n.content), 220) : "(no content)";
          return `${i + 1}. ${title}: ${content}`;
        })
        .join("\n") || "(no recent notes)";

    const tasksText =
      (tasks || [])
        .map((t: any, i: number) => {
          const title = t?.title ? clip(String(t.title), 90) : "(untitled)";
          const desc = t?.description ? clip(String(t.description), 160) : "";
          const done = t?.is_done ? "done" : "open";
          const due = t?.due_date ? ` | due ${t.due_date}` : "";
          return `${i + 1}. [${done}] ${title}${desc ? ` — ${desc}` : ""}${due}`;
        })
        .join("\n") || "(no recent tasks)";

    const contextText = `
DATE: ${today}

RECENT NOTES:
${notesText}

RECENT TASKS:
${tasksText}
`.trim();

    const systemPrompt = `
You are an AI summarizer inside a productivity app called "AI Productivity Hub".
${languageInstruction}
${toneDescription}
${focusArea ? `The user's main focus area is: "${focusArea}".` : ""}

Write a compact summary of the user's recent activity.

IMPORTANT:
- Use clear section headings exactly like below.
- Use short bullets.
- Be specific and actionable.
- Keep it under ~220 words.

FORMAT (plain text, no markdown):
SUMMARY:
<2–4 sentences>

PATTERNS:
- <bullet>
- <bullet>
- <bullet>

NEXT STEPS:
- <bullet>
- <bullet>
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextText },
      ],
      max_tokens: 420,
      temperature: 0.5,
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ||
      "SUMMARY:\nNot enough data yet.\n\nPATTERNS:\n- Keep writing notes.\n- Keep adding tasks.\n- Review daily.\n\nNEXT STEPS:\n- Add 1 priority for today.\n- Finish 1 open task.";

    // ✅ Increment usage after success (don’t fail response if usage write fails)
    const nextUsed = currentCount + 1;

    try {
      if (!usage) {
        const { error: insErr } = await supabaseAdmin.from("ai_usage").insert([
          { user_id: userId, usage_date: today, count: 1 },
        ]);
        if (insErr) console.error("[ai-summary] usage insert error", insErr);
      } else {
        const { error: updErr } = await supabaseAdmin
          .from("ai_usage")
          .update({ count: nextUsed })
          .eq("id", usage.id);
        if (updErr) console.error("[ai-summary] usage update error", updErr);
      }
    } catch (e) {
      console.error("[ai-summary] usage write exception", e);
    }

    return NextResponse.json(
      {
        ok: true,
        // ✅ preferred field for your readable box UI
        text,
        // ✅ keep old field for any existing UI still reading summary
        summary: text,
        plan: planRaw,
        dailyLimit,
        usedToday: nextUsed,
        usageDate: today,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[ai-summary] fatal", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "AI summary failed." },
      { status: 500 }
    );
  }
}
