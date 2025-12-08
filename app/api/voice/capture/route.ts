import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // 1) 🎙 Transcribe audio (auto language detection, keep original language)
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1", // auto-detect language & transcribe in the same language
    });

    const rawText = transcription.text?.trim() || "";
    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "Transcription is empty" },
        { status: 500 }
      );
    }

    // 2) 🤖 Ask the model for structured JSON in the *user's language*
    const systemPrompt = `
You are an assistant that turns messy spoken notes into structured productivity data.

IMPORTANT:
- First, detect the user's language from the transcript.
- Then, write ALL HUMAN-TEXT FIELDS in that same language.
- JSON KEYS must always stay in English exactly as specified below.

Given the transcript of what the user said, produce a JSON object with:

- "note": a cleaned-up note text (string, in the user's language)
- "note_category": a short category like "Work", "Personal", "Ideas", etc. 
    (string or null, in the user's language if possible)
- "actions": an array of short bullet-like action items (strings, in the user's language)
- "tasks": an array of objects:
    {
      "title": string,              // in the user's language
      "due_natural": string | null, // e.g. "αύριο το πρωί", "κατά τις 8 το βράδυ"
      "due_iso": string | null,     // ISO 8601 UTC datetime, e.g. "2025-12-10T09:00:00Z"
      "priority": "low" | "medium" | "high" | null
    }
- "reminder": an object
    {
      "time_natural": string | null, // e.g. "απόψε", "this evening", in the user's language
      "time_iso": string | null,     // ISO 8601 UTC datetime, or null
      "reason": string | null        // why the reminder is needed, in the user's language
    }
- "summary": 1–2 sentence summary (string, in the user's language)

Rules:

- If the user clearly gives a precise date/time, fill the ISO fields (due_iso, time_iso) with correct UTC ISO 8601.
- If the time is vague or not clearly stated, set the ISO field to null and ONLY use a natural-language description in the corresponding "..._natural" field.
- Do NOT invent exact times or dates if the user didn't clearly specify them.
- Keep the JSON well-formed and valid.
- Return ONLY valid JSON – no markdown, no commentary, no backticks.
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

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("[voice-capture] Failed to parse JSON:", err, content);
      return NextResponse.json(
        { ok: false, error: "Failed to parse AI JSON" },
        { status: 500 }
      );
    }

    // 3) ✅ Normalize shape so frontend always sees
    //    due_natural / due_iso / time_natural / time_iso

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t: any) => {
          const title = typeof t.title === "string" ? t.title : "";

          // backwards compatibility: if model ever returns "due" field
          let dueIso = t.due_iso ?? null;
          let dueNatural = t.due_natural ?? null;

          if (!dueIso && typeof t.due === "string" && t.due.trim()) {
            const raw = t.due.trim();
            const ms = Date.parse(raw);
            if (!Number.isNaN(ms)) {
              dueIso = new Date(ms).toISOString();
            } else {
              dueNatural = raw;
            }
          }

          return {
            title,
            due_natural:
              typeof dueNatural === "string" && dueNatural.trim()
                ? dueNatural.trim()
                : null,
            due_iso: typeof dueIso === "string" ? dueIso : null,
            priority:
              t.priority === "low" ||
              t.priority === "medium" ||
              t.priority === "high"
                ? t.priority
                : null,
          };
        })
      : [];

    const reminderRaw = parsed.reminder || {};
    let timeIso = reminderRaw.time_iso ?? null;
    let timeNatural = reminderRaw.time_natural ?? null;

    if (!timeIso && typeof reminderRaw.time === "string" && reminderRaw.time.trim()) {
      const raw = reminderRaw.time.trim();
      const ms = Date.parse(raw);
      if (!Number.isNaN(ms)) {
        timeIso = new Date(ms).toISOString();
      } else {
        timeNatural = raw;
      }
    }

    const reminder = {
      time_natural:
        typeof timeNatural === "string" && timeNatural.trim()
          ? timeNatural.trim()
          : null,
      time_iso: typeof timeIso === "string" ? timeIso : null,
      reason:
        typeof reminderRaw.reason === "string" && reminderRaw.reason.trim()
          ? reminderRaw.reason.trim()
          : null,
    };

    const structured = {
      note:
        typeof parsed.note === "string" && parsed.note.trim()
          ? parsed.note.trim()
          : null,
      note_category:
        typeof parsed.note_category === "string" && parsed.note_category.trim()
          ? parsed.note_category.trim()
          : null,
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
            .filter((a: any) => typeof a === "string" && a.trim())
            .map((a: string) => a.trim())
        : [],
      tasks,
      reminder,
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : null,
    };

    // 4) 📝 Optionally auto-insert note if mode === "autosave"
    let noteId: string | null = null;
    if (mode === "autosave" && structured.note) {
      const { data, error } = await supabaseAdmin
        .from("notes")
        .insert({
          user_id: userId,
          title: structured.summary || "Voice capture",
          content: structured.note,
          category: structured.note_category || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[voice-capture] Failed to insert note:", error);
      } else {
        noteId = data.id;
      }
    }

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
