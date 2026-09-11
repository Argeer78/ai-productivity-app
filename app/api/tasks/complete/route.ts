import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { authorizeOwnedResource } from "@/lib/resourceAuthorization";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const { taskId, completed } = await req.json().catch(() => ({}));

    if (typeof taskId !== "string" || !UUID_PATTERN.test(taskId) || (completed !== undefined && typeof completed !== "boolean")) {
      return NextResponse.json(
        { ok: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const auth = await getAuthenticatedUser(req);
    const authorization = await authorizeOwnedResource(auth, async (userId) => {
      const { data, error } = await supabaseAdmin
        .from("tasks")
        .select("id, title, completed, source_note_id")
        .eq("id", taskId)
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

    const { resource: task, user } = authorization;
    const nowIso = new Date().toISOString();
    const newCompleted = completed ?? true;

    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? nowIso : null,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[complete-task] update error", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update task" },
        { status: 500 }
      );
    }

    if (task.source_note_id) {
      const { data: note, error: noteError } = await supabaseAdmin
        .from("notes")
        .select("id, content")
        .eq("id", task.source_note_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!noteError && note) {
        const stamp = new Date().toLocaleString();
        const line = newCompleted
          ? `\n\n✅ Completed task: "${task.title}" at ${stamp}`
          : `\n\n⏪ Reopened task: "${task.title}" at ${stamp}`;

        const newContent = (note.content || "") + line;

        const { error: noteUpdateError } = await supabaseAdmin
          .from("notes")
          .update({ content: newContent })
          .eq("id", note.id)
          .eq("user_id", user.id);

        if (noteUpdateError) {
          console.error(
            "[complete-task] failed to update note content",
            noteUpdateError
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[complete-task] unexpected error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
