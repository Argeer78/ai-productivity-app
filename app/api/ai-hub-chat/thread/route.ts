import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { authorizeOwnedResource } from "@/lib/resourceAuthorization";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { threadId?: string }
      | null;

    const { threadId } = body || {};

    if (typeof threadId !== "string" || !UUID_PATTERN.test(threadId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const auth = await getAuthenticatedUser(req);
    const authorization = await authorizeOwnedResource(auth, async (userId) => {
      const { data, error } = await supabaseAdmin
        .from("ai_chat_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });

    if (authorization.status !== 200) {
      return NextResponse.json(
        { ok: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const userId = authorization.user.id;
    const { error: msgErr } = await supabaseAdmin
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

    const { error: threadErr } = await supabaseAdmin
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
