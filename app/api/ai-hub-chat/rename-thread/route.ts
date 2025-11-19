// app/api/ai-hub-chat/rename-thread/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { threadId?: string; title?: string; userId?: string }
      | null;

    const { threadId, title, userId } = body || {};

    if (!threadId || !title?.trim() || !userId) {
      return NextResponse.json(
        { ok: false, error: "Missing threadId, title, or userId" },
        { status: 400 }
      );
    }

    const newTitle = title.trim();
    const supa = supabase;

    const { data, error } = await supa
      .from("ai_chat_threads")
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("user_id", userId)
      .select("id, title, category, created_at, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[ai-hub-chat/rename-thread] update error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to rename chat." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Chat not found or not owned by user." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        thread: data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ai-hub-chat/rename-thread] POST route error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while renaming chat." },
      { status: 500 }
    );
  }
}
