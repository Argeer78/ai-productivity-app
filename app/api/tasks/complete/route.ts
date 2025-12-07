import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { taskId, completed } = await req.json().catch(() => ({}));

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "Missing taskId" },
        { status: 400 }
      );
    }

    // 1) Load the task (with source_note_id)
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, completed, source_note_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) {
      return NextResponse.json(
        { ok: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();
    const newCompleted = completed ?? true;

    // 2) Update the task as completed / not completed
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? nowIso : null,
      })
      .eq("id", taskId);

    if (updateError) {
      console.error("[complete-task] update error", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update task" },
        { status: 500 }
      );
    }

    // 3) If linked to a note, append a line to the note content
    if (task.source_note_id) {
      const { data: note, error: noteError } = await supabaseAdmin
        .from("notes")
        .select("id, content")
        .eq("id", task.source_note_id)
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
          .eq("id", note.id);

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
