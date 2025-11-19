// app/api/ai-hub-chat/thread/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { threadId?: string; userId?: string }
      | null;

    const { threadId, userId } = body || {};

    if (!threadId || !userId) {
      return NextResponse.json(
        { ok: false, error: "Missing threadId or userId" },
        { status: 400 }
      );
    }

    const supa = supabase;

    // 1) Delete messages for this thread & user
    const { error: msgErr } = await supa
      .from("ai_chat_messages")
      .delete()
      .eq("thread_id", threadId)
      .eq("user_id", userId);

    if (msgErr) {
      console.error("[ai-hub-chat/thread] delete messages error", msgErr);
      return NextResponse.json(
        { ok: false, error: "Failed to delete messages for this chat." },
        { status: 500 }
      );
    }

    // 2) Delete the thread row
    const { error: threadErr } = await supa
      .from("ai_chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", userId);

    if (threadErr) {
      console.error("[ai-hub-chat/thread] delete thread error", threadErr);
      return NextResponse.json(
        { ok: false, error: "Failed to delete chat thread." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[ai-hub-chat/thread] DELETE route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while deleting chat." },
      { status: 500 }
    );
  }
}
