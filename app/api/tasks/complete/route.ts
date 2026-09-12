import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { authorizeOwnedResource } from "@/lib/resourceAuthorization";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";

const requestSchema = z.object({ taskId: z.uuid(), completed: z.boolean().optional() }).strict();

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { taskId, completed } = parsedBody.data;

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
