import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceProviderRateLimit } from "@/lib/rateLimit";

const openaiApiKey = process.env.OPENAI_API_KEY;
const requestSchema = z.object({ content: z.string().trim().min(1).max(20_000), mode: z.enum(["summarize", "bullets", "rewrite"]).optional() }).strict();

export async function POST(req) {
  try {
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "AI is not configured on this environment." },
        { status: 503 }
      );
    }

    const client = new OpenAI({ apiKey: openaiApiKey, maxRetries: 0, timeout: 30_000 });
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.aiTextJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { content, mode } = parsedBody.data;
    const rateLimit = await enforceProviderRateLimit({ request: req, action: "ai:notes", rateClass: "ai-light" });
    if (!rateLimit.ok) return rateLimit.response;

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
  } catch {
    console.error("[ai-notes] provider request failed");
    return NextResponse.json(
      { error: "AI service is unavailable." },
      { status: 503 }
    );
  }
}
