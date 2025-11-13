// app/api/ai-digest/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Load user profile for email & tone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, ai_tone, focus_area")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 }
      );
    }
    if (!profile?.email) {
      return NextResponse.json(
        { error: "User has no email" },
        { status: 400 }
      );
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    // Recent notes (last 24h)
    const { data: notes } = await supabaseAdmin
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: true });

    // Recent tasks (last 24h or upcoming)
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, is_done, due_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const tone = profile.ai_tone || "balanced";
    const focus = profile.focus_area || "";

    const notesSummary =
      (notes || [])
        .map(
          (n) =>
            `- ${n.title || "(untitled)"}: ${(
              n.content || ""
            ).slice(0, 160)}`
        )
        .join("\n") || "(no recent notes)";

    const tasksSummary =
      (tasks || [])
        .slice(-30) // cap
        .map(
          (t) =>
            `- [${t.is_done ? "x" : " "}] ${t.title || "(untitled)"}${
              t.due_date ? ` (due ${t.due_date})` : ""
            }`
        )
        .join("\n") || "(no tasks yet)";

    const systemTone =
      tone === "friendly"
        ? "friendly and warm"
        : tone === "direct"
        ? "direct and concise"
        : tone === "motivational"
        ? "encouraging and energetic"
        : tone === "casual"
        ? "casual and relaxed"
        : "balanced and pragmatic";

    const focusLine = focus
      ? `The user says their main focus area is: "${focus}".`
      : "The user has not specified a main focus area.";

    const todayStr = now.toISOString().split("T")[0];

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
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const fullText = completion.choices[0]?.message?.content || "";

    const [subjectLine, ...rest] = fullText.split("---");
    const subject = subjectLine.replace(/^SUBJECT:\s*/i, "").trim();
    const body = rest.join("---").replace(/^BODY:\s*/i, "").trim();

    return NextResponse.json({
      email: profile.email,
      subject: subject || `Your daily AI digest – ${todayStr}`,
      body,
    });
  } catch (err: any) {
    console.error("AI digest error:", err);
    return NextResponse.json(
      { error: "Failed to build digest" },
      { status: 500 }
    );
  }
}
