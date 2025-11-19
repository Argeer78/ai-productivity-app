// app/api/ai-hub-chat/thread/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { threadId?: string }
      | null;

    if (!body?.threadId) {
      return NextResponse.json(
        { ok: false, error: "Missing threadId" },
        { status: 400 }
      );
    }

    const supa = supabase;

    // Require auth to delete
    const {
      data: { user },
      error: userErr,
    } = await supa.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const threadId = body.threadId;

    // 1) Delete messages in that thread for this user
    const { error: msgErr } = await supa
      .from("ai_chat_messages")
      .delete()
      .eq("thread_id", threadId)
      .eq("user_id", userId);

    if (msgErr) {
      console.error("[ai-hub-chat] delete messages error", msgErr);
    }

    // 2) Delete thread itself
    const { error: threadErr } = await supa
      .from("ai_chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", userId);

    if (threadErr) {
      console.error("[ai-hub-chat] delete thread error", threadErr);
      return NextResponse.json(
        { ok: false, error: "Could not delete thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[ai-hub-chat] delete route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
