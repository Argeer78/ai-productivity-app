import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      destination,
      checkin,
      checkout,
      adults,
      children,
      minBudget,
      maxBudget,
    } = body;

    if (!destination || !checkin || !checkout) {
      return NextResponse.json(
        { error: "Missing destination or dates." },
        { status: 400 }
      );
    }

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
You are a helpful AI travel planner.
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
      ],
      max_tokens: 600,
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
    return NextResponse.json(
      { error: "Unexpected error." },
      { status: 500 }
    );
  }
}
