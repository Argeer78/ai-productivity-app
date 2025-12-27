import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Use Node runtime for maximum compatibility
export const runtime = "nodejs";
export const maxDuration = 20; // seconds (hint for Vercel)

const apiKey = process.env.OPENAI_API_KEY;

// Initialise client (will throw if key is missing, so we guard above)
const client = apiKey ? new OpenAI({ apiKey }) : null;

type HistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!apiKey || !client) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPENAI_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string; // ✅ needed to count usage
      userMessage?: string;
      category?: string;
      history?: HistoryItem[];
      attachments?: { name: string; content: string }[];
    };

    const userId = body.userId ?? "";
    const userMessage = body.userMessage ?? "";
    const category = body.category ?? "General";
    const history: HistoryItem[] = Array.isArray(body.history) ? body.history : [];
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing userId in request body." }, { status: 400 });
    }

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ ok: false, error: "Missing userMessage in request body." }, { status: 400 });
    }

    // Handle Attachments (Pro check)
    let contextFromFiles = "";
    if (attachments.length > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single();
      const isPro = profile?.plan === "pro" || profile?.plan === "founder";
      if (!isPro) {
        return NextResponse.json({ ok: false, error: "Attachments are a Pro feature." }, { status: 403 });
      }
      contextFromFiles = attachments
        .map((f) => `\n---\nFILE: ${f.name}\nCONTENT:\n${f.content}\n---`)
        .join("\n");
    }

    // Build chat history for the model
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are an AI productivity coach inside an app called AI Productivity Hub. You help with planning, focus, mindset, tasks and tiny wins. Be concise, practical and friendly.\n\n" +
          (contextFromFiles ? `USER HAS ATTACHED FILES:\n${contextFromFiles}\nUse these to answer their questions.` : "")
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: `Category: ${category}\n\n${userMessage}`,
      },
    ];

    // Call OpenAI – gpt-4o-mini is cheap & fast
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a reply. Please try again.";

    const title = userMessage.split("\n")[0].slice(0, 80).trim();

    // ✅ Count 1 AI call (only after success)
    await bumpAiUsage(userId, 1);

    return NextResponse.json({
      ok: true,
      assistantMessage,
      title,
    });
  } catch (err: any) {
    console.error("[api/ai-hub-chat] error", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "The AI assistant had a problem responding. Please try again.",
      },
      { status: 500 }
    );
  }
}
