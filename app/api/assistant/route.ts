import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, context } = body as {
      message?: string;
      context?: string;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are an AI assistant inside a web app called "AI Productivity Hub".
Help the user with writing, summarizing, planning, or breaking down tasks.
Be concise and practical. If user refers to "my notes" or "my tasks",
answer generally since you don't have their data here.
${context ? `Extra context: ${context}` : ""}
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Assistant API error:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Something went wrong while talking to the assistant.",
      },
      { status: 500 }
    );
  }
}
