// app/api/ai-hub-chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabaseClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type RequestBody = {
  threadId?: string | null;
  category?: string | null;
  userMessage: string;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

// Helper: generate a short title from the first user message
async function generateTitleFromMessage(message: string): Promise<string> {
  const fallback =
    message.trim().length > 0
      ? message.trim().slice(0, 60)
      : "New conversation";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 20,
      messages: [
        {
          role: "system",
          content:
            "You are helping name chat conversations. " +
            "Return a very short (3–6 words) descriptive title. " +
            "Do not use quotes or punctuation at the start/end.",
        },
        { role: "user", content: message },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || fallback;

    const cleaned = raw.replace(/^["“”']+|["“”']+$/g, "").trim();
    return cleaned || fallback;
  } catch (err) {
    console.error("[ai-hub-chat] title generation error", err);
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;

    if (!body || !body.userMessage?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing userMessage" },
        { status: 400 }
      );
    }

    const supa = supabase;
    let userId: string | null = null;

    // Try to get current user (but allow anonymous usage)
    try {
      const { data, error } = await supa.auth.getUser();
      if (!error && data?.user) {
        userId = data.user.id;
      } else if (error) {
        console.warn("[ai-hub-chat] getUser error", error);
      }
    } catch (err) {
      console.error("[ai-hub-chat] getUser exception", err);
    }

    let threadId: string | null = body.threadId ?? null;

    // If logged in & no thread yet -> create one with auto title
    if (userId && !threadId) {
      const title = await generateTitleFromMessage(body.userMessage);

      const { data: threadRow, error: threadErr } = await supa
        .from("ai_chat_threads")
        .insert([
          {
            user_id: userId,
            title,
            category: body.category || null,
          },
        ])
        .select("id")
        .single();

      if (threadErr) {
        console.error("[ai-hub-chat] create thread error", threadErr);
      } else if (threadRow) {
        threadId = threadRow.id;
      }
    }

    // Build history for context if we have a user & thread
    const historyMessages: HistoryMessage[] = [];

    if (userId && threadId) {
      const { data: history, error: historyErr } = await supa
        .from("ai_chat_messages")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (historyErr) {
        console.error("[ai-hub-chat] history error", historyErr);
      } else if (history) {
        historyMessages.push(
          ...(history as { role: "user" | "assistant"; content: string }[])
        );
      }
    }

    // Build messages for OpenAI
    const messagesForOpenAI: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      {
        role: "system",
        content:
          "You are the AI coach in a productivity app called AI Productivity Hub. " +
          "Be friendly, concise, and practical. Help with planning, focus, mindset, " +
          "and general questions. Use clear formatting and short paragraphs.",
      },
      ...historyMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: body.userMessage,
      },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesForOpenAI,
      temperature: 0.6,
      max_tokens: 600,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a response.";

    // If we have a logged-in user + thread, persist the messages
    if (userId && threadId) {
      const { error: insertErr } = await supa.from("ai_chat_messages").insert([
        {
          thread_id: threadId,
          user_id: userId,
          role: "user",
          content: body.userMessage,
        },
        {
          thread_id: threadId,
          user_id: userId,
          role: "assistant",
          content: assistantMessage,
        },
      ]);

      if (insertErr) {
        console.error("[ai-hub-chat] insert messages error", insertErr);
      }

      const { error: updateThreadErr } = await supa
        .from("ai_chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", userId);

      if (updateThreadErr) {
        console.error(
          "[ai-hub-chat] update thread timestamp error",
          updateThreadErr
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        threadId,
        assistantMessage,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ai-hub-chat] route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
