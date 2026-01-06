import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiLanguageInstruction } from "@/lib/aiLanguage";

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
    console.error("[ai-travel-plan] profile plan error", profileErr);
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
    console.error("[ai-travel-plan] usage select error", usageError);
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
      console.error("[ai-travel-plan] usage insert error", insErr);
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
      console.error("[ai-travel-plan] usage update error", updErr);
      throw new Error("Failed to update AI usage.");
    }
    return { plan, dailyLimit, usedToday: next };
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      userId, // ✅ REQUIRED (send from client)
      destination,
      checkin,
      checkout,
      adults,
      children,
      minBudget,
      maxBudget,
    } = body as {
      userId?: string | null;
      destination?: string;
      checkin?: string;
      checkout?: string;
      adults?: number;
      children?: number;
      minBudget?: string | number;
      maxBudget?: string | number;
    };

    const isGuest = userId === "guest" || (userId && userId.startsWith("demo-"));

    if (!userId && !isGuest) {
      return NextResponse.json(
        { error: "You must be logged in to generate a travel plan." },
        { status: 401 }
      );
    }

    if (!destination || !checkin || !checkout) {
      return NextResponse.json(
        { error: "Missing destination or dates." },
        { status: 400 }
      );
    }

    // ✅ Fetch user language (and only what we need)
    let languageCode = "en";
    if (!isGuest && userId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("ui_language")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("[ai-travel-plan] profile error:", profileError);
      }
      languageCode = profile?.ui_language || "en";
    }
    const languageInstruction = aiLanguageInstruction(languageCode);

    // ✅ Count AI call ONLY if we're going to call OpenAI
    // (we call it right before the OpenAI request)
    let usageMeta:
      | { plan: string; dailyLimit: number; usedToday: number }
      | null = null;

    usageMeta = isGuest ? null : await checkAndIncrementAiUsage(userId!);

    const datesText = `${checkin} → ${checkout}`;
    const peopleText = `${adults || 1} adult(s)${children ? `, ${children} child(ren)` : ""
      }`;

    const budgetText =
      minBudget || maxBudget
        ? `With a budget between ${minBudget || "?"} and ${maxBudget || "?"
        } (currency user prefers).`
        : "Budget is flexible or not specified.";

    const systemPrompt = `
You are a helpful AI travel planner inside an app.
${languageInstruction}

Given a destination, dates, number of people and rough budget,
propose a simple, practical itinerary.

Rules:
- Keep it concise and skimmable (max ~500 words).
- Break down by day (Day 1, Day 2, etc.).
- Suggest 2–3 main activities per day, with short descriptions.
- Include a short "Overall tips" section at the end (transport, neighborhoods, weather notes).
- DO NOT recommend specific hotels by name (the user will browse accommodations separately).
- Focus on practical sightseeing + rest balance, not generic filler.
`.trim();

    const userPrompt = `
Destination: ${destination}
Dates: ${datesText}
People: ${peopleText}
Budget: ${budgetText}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        // ✅ Optional reinforcement (helps prevent random English)
        { role: "system", content: languageInstruction },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Empty AI response", plan: null },
        { status: 500 }
      );
    }

    // ✅ Return plan, plus optional metadata (handy for debugging / UI)
    return NextResponse.json({
      ok: true,
      plan: content,
      ...(usageMeta
        ? {
          planTier: usageMeta.plan,
          dailyLimit: usageMeta.dailyLimit,
          usedToday: usageMeta.usedToday,
        }
        : {}),
    });
  } catch (err: any) {
    // ✅ surface limit errors cleanly
    if (err?.status === 429) {
      return NextResponse.json(
        {
          error: err.message || "Daily AI limit reached.",
          planTier: err.plan,
          dailyLimit: err.dailyLimit,
          usedToday: err.usedToday,
        },
        { status: 429 }
      );
    }

    console.error("[ai-travel-plan] error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
