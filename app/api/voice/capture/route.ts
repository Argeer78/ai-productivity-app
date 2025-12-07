// app/api/voice/capture/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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

    // Debug info for us (shows up in server logs)
    console.log("[voice-capture] file:", {
      name: (file as any).name,
      type: file.type,
      size: file.size,
    });

    // 1) Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",     // 🔒 very robust model
      language: "en",          // 🔒 force English (change to "el" if you speak Greek)
      temperature: 0,
    });

    const rawText = transcription.text?.trim() || "";
    console.log("[voice-capture] transcript:", rawText);

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "Transcription is empty" },
        { status: 500 }
      );
    }

    // 2) Structure it with a chat model
    const systemPrompt = `
You are an assistant that turns messy spoken notes into structured productivity data.

Given the transcript of what the user said, produce a JSON object with:

- "note": a cleaned-up note text (string)
- "note_category": short category like "Work", "Personal", "Ideas", etc. (string or null)
- "actions": an array of short bullet-like action items (strings)
- "tasks": an array of objects:
    {
      "title": string,
      "due_natural": string | null,  // e.g. "tomorrow at 5pm"
      "due_iso": string | null,      // ISO datetime if you can infer it, otherwise null
      "priority": "low" | "medium" | "high" | null
    }
- "reminder": an object
    {
      "time_natural": string | null, // e.g. "this evening", "in 2 hours"
      "time_iso": string | null,     // ISO datetime if you can infer it, otherwise null
      "reason": string | null        // why this reminder matters
    }
- "summary": 1–2 sentence summary (string)

If something is not present (e.g. no clear due date or reminder), use null.
Return ONLY valid JSON. Do not include any extra commentary.
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
      console.error("[voice-capture] Empty AI structuring response");
      return NextResponse.json(
        { ok: false, error: "Empty AI response" },
        { status: 500 }
      );
    }

    let structured: {
      note?: string;
      note_category?: string;
      actions?: string[];
      tasks?: {
        title: string;
        due_natural?: string | null;
        due_iso?: string | null;
        priority?: "low" | "medium" | "high" | null;
      }[];
      reminder?: {
        time_natural?: string | null;
        time_iso?: string | null;
        reason?: string | null;
      };
      summary?: string;
    };

    try {
      structured = JSON.parse(content);
    } catch (err) {
      console.error("[voice-capture] Failed to parse JSON:", err, content);
      return NextResponse.json(
        { ok: false, error: "Failed to parse AI JSON" },
        { status: 500 }
      );
    }

    // 3) Optionally auto-save as a note if user chose autosave
    let noteId: string | null = null;
    if (mode === "autosave" && structured.note) {
      try {
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
      } catch (err) {
        console.error("[voice-capture] Exception inserting note:", err);
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
