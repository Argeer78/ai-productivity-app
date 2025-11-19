// app/api/ai-hub-chat/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper: generate a short title from first user message
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
        {
          role: "user",
          content: message,
        },
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
    const body = (await req.json().catch(() => null)) as
      | {
          threadId?: string | null;
          userId?: string | null;
          category?: string | null;
          userMessage: string;
        }
      | null;

    if (!body || !body.userMessage?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing userMessage" },
        { status: 400 }
      );
    }

    const { threadId: incomingThreadId, userId, category, userMessage } =
      body;

    if (!userId) {
      // we rely on userId from the client in this project
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const supa = supabase;
    let threadId = incomingThreadId || null;

    // 1) Ensure thread exists & belongs to this user
    if (threadId) {
      const { data: existing, error: tErr } = await supa
        .from("ai_chat_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();

      if (tErr) {
        console.error("[ai-hub-chat] fetch thread error", tErr);
        return NextResponse.json(
          { ok: false, error: "Failed to load conversation." },
          { status: 500 }
        );
      }

      if (!existing) {
        // Thread does not belong to this user or does not exist
        threadId = null;
      }
    }

    // If no valid thread, create a new one with an auto title
    if (!threadId) {
      const title = await generateTitleFromMessage(userMessage);

      const { data: thread, error: insertThreadErr } = await supa
        .from("ai_chat_threads")
        .insert([
          {
            user_id: userId,
            title,
            category: category || null,
          },
        ])
        .select("id")
        .single();

      if (insertThreadErr || !thread) {
        console.error("[ai-hub-chat] insert thread error", insertThreadErr);
        return NextResponse.json(
          { ok: false, error: "Failed to create conversation." },
          { status: 500 }
        );
      }

      threadId = thread.id;
    }

    // 2) Fetch last messages for context
    const { data: history, error: historyErr } = await supa
      .from("ai_chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(15);

    if (historyErr) {
      console.error("[ai-hub-chat] history error", historyErr);
    }

    const messages: {
      role: "user" | "assistant" | "system";
      content: string;
    }[] = [];

    // System prompt
    messages.push({
      role: "system",
      content:
        "You are the AI coach in a productivity app called AI Productivity Hub. " +
        "Be friendly, concise, and practical. Help with planning, focus, mindset, and general questions.",
    });

    // Previous messages
    if (history && history.length > 0) {
      for (const m of history as any[]) {
        if (m.role === "user" || m.role === "assistant") {
          messages.push({
            role: m.role,
            content: m.content,
          });
        }
      }
    }

    // New user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // 3) Call OpenAI for assistant reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 600,
      temperature: 0.7,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a reply.";

    // 4) Save user + assistant messages
    const { error: insertErr } = await supa.from("ai_chat_messages").insert([
      {
        thread_id: threadId,
        user_id: userId,
        role: "user",
        content: userMessage,
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

    // 5) Update updated_at + category on the thread
    const { error: updateThreadErr } = await supa
      .from("ai_chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        category: category || null,
      })
      .eq("id", threadId)
      .eq("user_id", userId);

    if (updateThreadErr) {
      console.error(
        "[ai-hub-chat] update thread timestamp error",
        updateThreadErr
      );
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
