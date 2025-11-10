import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { content, mode } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "No note content provided." },
        { status: 400 }
      );
    }

    // Choose prompt depending on mode
    let prompt = "";
    if (mode === "summarize") {
      prompt = `Summarize this note in 3-5 concise sentences:\n\n${content}`;
    } else if (mode === "bullets") {
      prompt = `Turn this note into a clear bullet point list:\n\n${content}`;
    } else if (mode === "rewrite") {
      prompt = `Rewrite this note in a more professional, clear way:\n\n${content}`;
    } else {
      prompt = `Summarize this note briefly:\n\n${content}`;
    }

    const completion = await client.responses.create({
      model: "gpt-4.1-mini", // good balance of quality + speed
      input: prompt,
    });

    const aiText = completion.output[0].content[0].text;

    return NextResponse.json({ result: aiText });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "AI request failed." },
      { status: 500 }
    );
  }
}
