import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiLanguageInstruction } from "@/lib/aiLanguage";

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
      userId, // ✅ NEW (send from client)
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

    if (!userId) {
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

    // ✅ Fetch user language
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("ui_language") // ⚠️ change if your column is named differently
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[ai-travel-plan] profile error:", profileError);
    }

    const languageCode = profile?.ui_language || "en";
    const languageInstruction = aiLanguageInstruction(languageCode);

    const datesText = `${checkin} → ${checkout}`;
    const peopleText = `${adults || 1} adult(s)${
      children ? `, ${children} child(ren)` : ""
    }`;

    const budgetText =
      minBudget || maxBudget
        ? `With a budget between ${minBudget || "?"} and ${
            maxBudget || "?"
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

    return NextResponse.json({ ok: true, plan: content });
  } catch (err) {
    console.error("[ai-travel-plan] error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
