// app/api/ai-hub-chat/rename-thread/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { threadId?: string; title?: string }
      | null;

    if (!body?.threadId || !body?.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing threadId or title" },
        { status: 400 }
      );
    }

    const newTitle = body.title.trim().slice(0, 100);

    const supa = supabase;
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

    const { data, error: updateErr } = await supa
      .from("ai_chat_threads")
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.threadId)
      .eq("user_id", userId)
      .select("id, title, category, updated_at")
      .single();

    if (updateErr) {
      console.error("[ai-hub-chat] rename thread error", updateErr);
      return NextResponse.json(
        { ok: false, error: "Could not rename thread" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, thread: data },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ai-hub-chat] rename route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
