import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type StructuredResult = {
  note: string | null;
  note_category: string | null;
  actions: string[];
  tasks: {
    title: string;
    due_natural: string | null;
    due_iso: string | null;
    priority: "low" | "medium" | "high" | null;
  }[];
  reminder:
    | {
        time_natural: string | null;
        time_iso: string | null;
        reason: string | null;
      }
    | null;
  summary: string | null;
};

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const modeRaw = (formData.get("mode") as string | null) || "review";
    const mode = modeRaw === "autosave" ? "autosave" : "review";

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Missing audio file" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // 1) Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe", // or "whisper-1"
    });

    const rawText = transcription.text?.trim() || "";
    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "Transcription is empty" },
        { status: 500 }
      );
    }

    // 2) Ask the model to structure it into rich JSON
    const systemPrompt = `
You are an assistant that turns messy spoken notes into structured productivity data.

Given the transcript of what the user said, produce ONLY valid JSON with this exact shape:

{
  "note": string | null,
  "note_category": "Work" | "Personal" | "Ideas" | "Meeting Notes" | "Study" | "Journal" | "Planning" | "Research" | "Other" | null,
  "actions": string[] | null,
  "tasks": [
    {
      "title": string,
      "due_natural": string | null,
      "due_iso": string | null,
      "priority": "low" | "medium" | "high" | null
    }
  ] | null,
  "reminder": {
    "time_natural": string | null,
    "time_iso": string | null,
    "reason": string | null
  } | null,
  "summary": string | null
}

Guidelines:
- "note": a cleaned-up note text (short paragraphs).
- "note_category": pick the single best-fitting category from the list, or null if unclear.
- "actions": 2–6 concrete next-step bullet items (short, imperative), or null if none.
- "tasks": use when the user clearly describes actionable TODOs. Each must have a "title".
  - If the user mentions a time or date (e.g. "tomorrow at 3pm", "next Monday morning"):
    - Put the original phrase in "due_natural".
    - If you can, convert to an ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS) in "due_iso".
    - If you cannot parse reliably, set "due_iso" to null.
  - "priority":
    - "high" for urgent/important items, deadlines, or strong language ("ASAP", "must", "today").
    - "medium" for normal tasks.
    - "low" for vague ideas, nice-to-haves, or long-term items.
- "reminder": only fill if the user seems to ask for a reminder.
  - "time_natural": the phrase they used ("tomorrow at 9", "next Monday morning").
  - "time_iso": ISO datetime if you can reasonably infer it, otherwise null.
  - "reason": a short description of what they're being reminded about.
- "summary": 1–2 sentence plain-language summary of the note.

If something is not present, use null (or an empty array for actions/tasks).
Return ONLY JSON, no extra text.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Empty AI response" },
        { status: 500 }
      );
    }

    // 3) Parse + normalize structured JSON
    let rawStructured: any;
    try {
      rawStructured = JSON.parse(content);
    } catch (err) {
      console.error("[voice-capture] Failed to parse JSON:", err, content);
      return NextResponse.json(
        { ok: false, error: "Failed to parse AI JSON" },
        { status: 500 }
      );
    }

    const structured: StructuredResult = {
      note:
        typeof rawStructured.note === "string" && rawStructured.note.trim()
          ? rawStructured.note
          : null,
      note_category:
        typeof rawStructured.note_category === "string" &&
        rawStructured.note_category.trim()
          ? rawStructured.note_category
          : null,
      actions: Array.isArray(rawStructured.actions)
        ? rawStructured.actions.filter((a: any) => typeof a === "string")
        : [],
      tasks: Array.isArray(rawStructured.tasks)
        ? rawStructured.tasks
            .filter((t: any) => t && typeof t.title === "string")
            .map((t: any) => ({
              title: t.title,
              due_natural:
                typeof t.due_natural === "string" && t.due_natural.trim()
                  ? t.due_natural
                  : null,
              due_iso:
                typeof t.due_iso === "string" && t.due_iso.trim()
                  ? t.due_iso
                  : null,
              priority:
                t.priority === "low" ||
                t.priority === "medium" ||
                t.priority === "high"
                  ? t.priority
                  : null,
            }))
        : [],
      reminder:
        rawStructured.reminder && typeof rawStructured.reminder === "object"
          ? {
              time_natural:
                typeof rawStructured.reminder.time_natural === "string" &&
                rawStructured.reminder.time_natural.trim()
                  ? rawStructured.reminder.time_natural
                  : null,
              time_iso:
                typeof rawStructured.reminder.time_iso === "string" &&
                rawStructured.reminder.time_iso.trim()
                  ? rawStructured.reminder.time_iso
                  : null,
              reason:
                typeof rawStructured.reminder.reason === "string" &&
                rawStructured.reminder.reason.trim()
                  ? rawStructured.reminder.reason
                  : null,
            }
          : null,
      summary:
        typeof rawStructured.summary === "string" &&
        rawStructured.summary.trim()
          ? rawStructured.summary
          : null,
    };

    // 4) Autosave note (optional) — if mode = autosave and we have a note
    let noteId: string | null = null;
    if (mode === "autosave" && structured.note) {
      try {
        const { data, error } = await supabaseAdmin
          .from("notes")
          .insert({
            user_id: userId,
            title: structured.summary || "Voice capture",
            content: structured.note,
            // if your notes table has "category" column, this will set it;
            // otherwise, you can remove this line
            category: structured.note_category || null,
          })
          .select("id")
          .single();

        if (error) {
          console.error("[voice-capture] Failed to insert note:", error);
        } else {
          noteId = data.id;
        }
      } catch (err) {
        console.error("[voice-capture] Exception inserting note:", err);
      }
    }

    // 5) Return structured result to the client
    return NextResponse.json({
      ok: true,
      rawText,
      structured,
      noteId,
      mode,
    });
  } catch (err) {
    console.error("[voice-capture] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
