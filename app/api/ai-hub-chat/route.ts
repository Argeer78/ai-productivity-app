import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // if you have a special server client, use that instead
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as {
      threadId?: string | null;
      category?: string | null;
      userMessage: string;
    } | null;

    if (!body || !body.userMessage?.trim()) {
      return NextResponse.json(
        { error: "Missing userMessage" },
        { status: 400 }
      );
    }

    const supa = supabase; // or createServerSupabaseClient if you use cookies

    // 1) Get user from Supabase auth (server-side)
    const {
      data: { user },
      error: userErr,
    } = await supa.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;
    let threadId = body.threadId || null;

    // 2) If no threadId, create a new thread with a tentative title
    if (!threadId) {
      const tentativeTitle = body.userMessage.slice(0, 60) || "New conversation";

      const { data: thread, error: threadErr } = await supa
        .from("ai_chat_threads")
        .insert([
          {
            user_id: userId,
            title: tentativeTitle,
            category: body.category || null,
          },
        ])
        .select("id, title")
        .single();

      if (threadErr || !thread) {
        console.error("[ai-hub-chat] create thread error", threadErr);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      threadId = thread.id;
    }

    // 3) Fetch last N messages to give context (e.g., last 15)
    const { data: history, error: historyErr } = await supa
      .from("ai_chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(15);

    if (historyErr) {
      console.error("[ai-hub-chat] history error", historyErr);
    }

    const messages: { role: "user" | "assistant" | "system"; content: string }[] =
      (history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

    // Add system prompt
    messages.unshift({
      role: "system",
      content:
        "You are the AI coach in a productivity app called AI Productivity Hub. " +
        "Be friendly, concise, and practical. Help with planning, focus, mindset, and general questions.",
    });

    // Add new user message
    messages.push({
      role: "user",
      content: body.userMessage,
    });

    // 4) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 600,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a response.";

    // 5) Save both messages
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
      // We still return the answer to the user, just warn
    }

    // 6) Optionally, refine the title on first message only
    // You can extend this to use another small OpenAI call.

    return NextResponse.json({
      ok: true,
      threadId,
      assistantMessage,
    });
  } catch (err) {
    console.error("[ai-hub-chat] route error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
