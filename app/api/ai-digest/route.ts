// app/api/ai-digest/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

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

function buildSystemTone(tone?: string | null) {
  switch (tone) {
    case "friendly":
      return "friendly and warm";
    case "direct":
      return "direct and concise";
    case "motivational":
      return "encouraging and energetic";
    case "casual":
      return "casual and relaxed";
    case "balanced":
    default:
      return "balanced and pragmatic";
  }
}

// Robust parsing (won’t break if model slightly changes separators)
function parseDigest(text: string, todayStr: string) {
  const raw = (text || "").trim();

  let subject = "";
  let body = raw;

  // Try SUBJECT: ... then BODY:
  const subjMatch = raw.match(/SUBJECT:\s*(.+)/i);
  if (subjMatch?.[1]) subject = subjMatch[1].trim();

  const bodyMatch = raw.match(/BODY:\s*([\s\S]*)$/i);
  if (bodyMatch?.[1]) body = bodyMatch[1].trim();

  // If it used the --- delimiter, still handle that
  if (!bodyMatch && raw.includes("---")) {
    const parts = raw.split("---");
    const maybeSubject = parts[0]?.replace(/^SUBJECT:\s*/i, "").trim();
    const maybeBody = parts.slice(1).join("---").replace(/^BODY:\s*/i, "").trim();
    if (maybeSubject) subject = subject || maybeSubject;
    if (maybeBody) body = maybeBody;
  }

  if (!subject) subject = `Your daily AI digest – ${todayStr}`;
  if (!body) body = "No content generated.";

  return { subject, body };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string | null };
    const userId = body.userId || null;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    // ✅ Athens date for both digest label + ai_usage row
    const todayStr = getTodayAthensYmd();

    // Load user profile for email + plan limits + tone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, plan, ai_tone, focus_area")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[ai-digest] profile error", profileError);
      return NextResponse.json({ ok: false, error: "Failed to load profile" }, { status: 500 });
    }

    if (!profile?.email) {
      return NextResponse.json({ ok: false, error: "User has no email" }, { status: 400 });
    }

    const planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAdmin = adminEmail && profile?.email && profile.email === adminEmail;
    const isPro = planRaw === "pro" || planRaw === "founder" || isAdmin;
    const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // ✅ Check usage (same ai_usage table your header uses)
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("usage_date", todayStr)
      .maybeSingle();

    if (usageError && (usageError as any).code !== "PGRST116") {
      console.error("[ai-digest] usage select error", usageError);
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

    // Last 24h window (server time is fine here; it’s “roughly last 24h”)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    // Recent notes (last 24h)
    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: true })
      .limit(80);

    if (notesErr) console.error("[ai-digest] notes load error", notesErr);

    // Tasks (cap, avoid huge prompt)
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, is_done, due_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (tasksErr) console.error("[ai-digest] tasks load error", tasksErr);

    const notesSummary =
      (notes || [])
        .map((n: any) => `- ${n.title || "(untitled)"}: ${(n.content || "").slice(0, 160)}`)
        .join("\n") || "(no recent notes)";

    const tasksSummary =
      (tasks || [])
        .slice(0, 40)
        .map(
          (t: any) =>
            `- [${t.is_done ? "x" : " "}] ${t.title || "(untitled)"}${t.due_date ? ` (due ${t.due_date})` : ""}`
        )
        .join("\n") || "(no tasks yet)";

    const systemTone = buildSystemTone(profile.ai_tone);
    const focus = profile.focus_area || "";
    const focusLine = focus
      ? `The user says their main focus area is: "${focus}".`
      : "The user has not specified a main focus area.";

    const prompt = `
You are an AI productivity assistant that writes a short daily email digest.

Write a brief, clear digest for the user for date ${todayStr}.
${focusLine}

Recent notes (last ~24h):
${notesSummary}

Tasks (completed + open):
${tasksSummary}

Your output MUST have this structure (no markdown):

SUBJECT: <a short email subject, max 70 characters>
---
BODY:
<3–6 short paragraphs or bullet lists: 
- a short friendly opener
- 3–5 key highlights from notes / tasks
- 3 suggested next actions for today or tomorrow
- 1 gentle encouragement line>

Keep the tone ${systemTone}. Keep it under 350 words.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 650,
    });

    const fullText = completion.choices[0]?.message?.content || "";
    const { subject, body: emailBody } = parseDigest(fullText, todayStr);

    // ✅ Increment usage (don’t fail the digest if write fails)
    try {
      if (!usage) {
        const { error: insErr } = await supabaseAdmin
          .from("ai_usage")
          .insert([{ user_id: userId, usage_date: todayStr, count: 1 }]);
        if (insErr) console.error("[ai-digest] usage insert error", insErr);
      } else {
        const { error: updErr } = await supabaseAdmin
          .from("ai_usage")
          .update({ count: currentCount + 1 })
          .eq("id", usage.id);
        if (updErr) console.error("[ai-digest] usage update error", updErr);
      }
    } catch (e) {
      console.error("[ai-digest] usage write exception", e);
    }

    return NextResponse.json({
      ok: true,
      email: profile.email,
      subject,
      body: emailBody,
      plan: planRaw,
      dailyLimit,
      usedToday: currentCount + 1,
      usageDate: todayStr,
    });
  } catch (err: any) {
    console.error("[ai-digest] fatal", err);
    return NextResponse.json({ ok: false, error: "Failed to build digest" }, { status: 500 });
  }
}
