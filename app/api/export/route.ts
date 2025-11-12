import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mdEscape(s: string) {
  return (s || "").replace(/\r?\n/g, "\n");
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("notes")
      .select("content, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (notesError) {
      console.error("export: notes error", notesError);
    }

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("title, description, completed, due_date, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (tasksError) {
      console.error("export: tasks error", tasksError);
    }

    // Build Markdown
    const now = new Date().toISOString();
    let md = `# AI Productivity Hub — Export\n\n`;
    md += `Exported at: ${now}\n\n`;

    md += `## Notes\n\n`;
    if (notes && notes.length) {
      notes.forEach((n, i) => {
        md += `### Note ${i + 1}\n`;
        md += `- Created: ${n.created_at}\n`;
        md += `- Updated: ${n.updated_at || "-"}\n\n`;
        md += `${mdEscape(n.content || "")}\n\n`;
        md += `---\n\n`;
      });
    } else {
      md += `_No notes_\n\n`;
    }

    md += `## Tasks\n\n`;
    if (tasks && tasks.length) {
      tasks.forEach((t, i) => {
        md += `### Task ${i + 1}\n`;
        md += `- Title: ${t.title || "(untitled)"}\n`;
        md += `- Description: ${t.description ? mdEscape(t.description) : "-"}\n`;
        md += `- Completed: ${t.completed ? "Yes" : "No"}\n`;
        md += `- Due: ${t.due_date || "-"}\n`;
        md += `- Created: ${t.created_at}\n`;
        md += `- Updated: ${t.updated_at || "-"}\n\n`;
        md += `---\n\n`;
      });
    } else {
      md += `_No tasks_\n\n`;
    }

    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="aih_export_${now.slice(0,10)}.md"`,
      },
    });
  } catch (err: any) {
    console.error("export route error", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
