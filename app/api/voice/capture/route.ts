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
    const mode = modeRaw === "autosave" ? "autosave" : "review"; // 🆕 new

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

    // 2) Structure it
    const systemPrompt = `
You are an assistant that turns messy spoken notes into structured productivity data.

Given the transcript of what the user said, produce a JSON object with:
- "note": a cleaned-up note text (string)
- "actions": an array of short bullet-like action items (strings)
- "tasks": an array of objects { "title": string, "due": string | null }
- "reminder": an object { "time": string | null, "reason": string | null }
- "summary": 1–2 sentence summary (string)

If something is not present (e.g. no clear due date), use null.
Return ONLY valid JSON.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Empty AI response" },
        { status: 500 }
      );
    }

    let structured: {
      note?: string;
      actions?: string[];
      tasks?: { title: string; due: string | null }[];
      reminder?: { time: string | null; reason: string | null };
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

    // 🆕 Only auto-insert note if user selected autosave mode
    let noteId: string | null = null;
    if (mode === "autosave" && structured.note) {
      const { data, error } = await supabaseAdmin
        .from("notes")
        .insert({
          user_id: userId,
          title: structured.summary || "Voice capture",
          content: structured.note,
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
      mode, // just to see what was used
    });
  } catch (err) {
    console.error("[voice-capture] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
