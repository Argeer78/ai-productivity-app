import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Missing text or targetLang" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a translation engine. Translate the user's text into the target language (${targetLang}). 
- Keep meaning, tone and formatting as much as possible.
- Do NOT add explanations or comments. 
- Only return the translated text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    });

    const translation =
      completion.choices[0]?.message?.content?.trim() || "";

    if (!translation) {
      return NextResponse.json(
        { error: "No translation generated." },
        { status: 500 }
      );
    }

    // TODO: if you want to count AI usage here, call your existing
    // tracking helper, e.g. incrementAiUsage(userId, 1);

    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[ai-translate] error", err);
    return NextResponse.json(
      { error: "Server error while translating." },
      { status: 500 }
    );
  }
}
