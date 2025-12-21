import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const DEFAULT_TZ = "Europe/Athens";

function getNowContext(timeZone: string) {
  const now = new Date();

  const nowLocal = now.toLocaleString("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const nowUtcIso = now.toISOString();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const yyyy = parts.find((p) => p.type === "year")?.value || "0000";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  const todayLocalYmd = `${yyyy}-${mm}-${dd}`;

  return { nowUtcIso, nowLocal, todayLocalYmd };
}

function jsonError(message: string, status = 500, detail?: any) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      detail: detail ? String(detail) : undefined,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    // ✅ Fail fast if env missing (common cause of "mysterious" 500)
    if (!process.env.OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY is missing on the server.", 500);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Expected multipart/form-data", 400);
    }

    const formData = await req.formData();

    const file = formData.get("file");
    const userIdRaw = formData.get("userId");
    const userId = typeof userIdRaw === "string" ? userIdRaw : "";

    const modeRaw = (formData.get("mode") as string | null) || "review";
    const mode =
      modeRaw === "autosave" ? "autosave" : modeRaw === "psych" ? "psych" : "review";

    const tz = (formData.get("tz") as string | null) || DEFAULT_TZ;

    if (!(file instanceof File)) {
      return jsonError("Missing audio file (file).", 400);
    }
    if (!userId) {
      return jsonError("Missing userId.", 400);
    }

    // Helpful debug (check server logs)
    console.log("[voice-capture] upload", {
      userId,
      mode,
      tz,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // ✅ Convert the Web File -> OpenAI-friendly upload
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const safeType = file.type || "audio/webm";
    const safeName = file.name || (safeType.includes("mp4") ? "voice-note.mp4" : "voice-note.webm");

    const openaiFile = await toFile(buf, safeName, { type: safeType });

    // 1) 🎙 Transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "whisper-1",
    });

    const rawText = transcription.text?.trim() || "";
    if (!rawText) {
      return jsonError("Transcription is empty", 500);
    }

    const { nowUtcIso, nowLocal, todayLocalYmd } = getNowContext(tz);

    const productivityPrompt = `
You are an assistant that turns messy spoken notes into structured productivity data.

IMPORTANT:
- First, detect the user's language from the transcript.
- Then, write ALL HUMAN-TEXT FIELDS in that same language.
- JSON KEYS must always stay in English exactly as specified below.

TIME CONTEXT (very important for "today", "tomorrow", "tonight", etc):
- User timezone: ${tz}
- Current local date/time in that timezone: ${nowLocal}
- Today's local date (YYYY-MM-DD): ${todayLocalYmd}
- Current UTC ISO: ${nowUtcIso}

Given the transcript of what the user said, produce a JSON object with:

- "note": a cleaned-up note text (string, in the user's language)
- "note_category": a short category like "Work", "Personal", "Ideas", etc.
    (string or null, in the user's language if possible)
- "actions": an array of short bullet-like action items (strings, in the user's language)
- "tasks": an array of objects:
    {
      "title": string,
      "due_natural": string | null,
      "due_iso": string | null,
      "priority": "low" | "medium" | "high" | null
    }
- "reminder": an object
    {
      "time_natural": string | null,
      "time_iso": string | null,
      "reason": string | null
    }
- "summary": 1–2 sentence summary (string, in the user's language)

Rules:
- Interpret relative dates using the TIME CONTEXT above.
- If precise date/time, fill ISO fields with correct UTC ISO 8601.
- If vague, set ISO null and use natural field.
- Do NOT invent exact times/dates.
- Return ONLY valid JSON.
`.trim();

    const psychPrompt = `
You are a supportive AI reflection companion (NOT a therapist).

GOAL:
- Help the user reflect on their thoughts and feelings.
- Respond with empathy and clarity.
- Suggest small, practical next steps only if appropriate.

STRICT RULES:
- Do NOT diagnose.
- Do NOT claim medical/therapeutic authority.
- Do NOT say you are a therapist.
- If user expresses imminent danger/self-harm intent: encourage local emergency services or trusted person.

LANGUAGE:
- Detect user's language from the transcript.
- Write ALL HUMAN-TEXT FIELDS in that same language.
- JSON KEYS stay in English.

TIME CONTEXT:
- User timezone: ${tz}
- Current local date/time: ${nowLocal}
- Today's local date (YYYY-MM-DD): ${todayLocalYmd}
- Current UTC ISO: ${nowUtcIso}

Return ONLY JSON:
{
  "reflection": string,
  "emotional_state": string|null,
  "grounding": string|null,
  "note": string|null,
  "tasks": [
    { "title": string, "due_natural": string|null, "due_iso": string|null, "priority": "low"|"medium"|"high"|null }
  ],
  "summary": string|null
}
`.trim();

    const systemPrompt = mode === "psych" ? psychPrompt : productivityPrompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jsonError("Empty AI response", 500);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("[voice-capture] Failed to parse JSON:", err, content);
      return jsonError("Failed to parse AI JSON", 500);
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t: any) => {
          const title = typeof t.title === "string" ? t.title : "";

          let dueIso = t.due_iso ?? null;
          let dueNatural = t.due_natural ?? null;

          if (!dueIso && typeof t.due === "string" && t.due.trim()) {
            const raw = t.due.trim();
            const ms = Date.parse(raw);
            if (!Number.isNaN(ms)) dueIso = new Date(ms).toISOString();
            else dueNatural = raw;
          }

          return {
            title,
            due_natural: typeof dueNatural === "string" && dueNatural.trim() ? dueNatural.trim() : null,
            due_iso: typeof dueIso === "string" && dueIso.trim() ? dueIso : null,
            priority: t.priority === "low" || t.priority === "medium" || t.priority === "high" ? t.priority : null,
          };
        })
      : [];

    const reminderRaw = parsed.reminder || {};
    let timeIso = reminderRaw.time_iso ?? null;
    let timeNatural = reminderRaw.time_natural ?? null;

    if (!timeIso && typeof reminderRaw.time === "string" && reminderRaw.time.trim()) {
      const raw = reminderRaw.time.trim();
      const ms = Date.parse(raw);
      if (!Number.isNaN(ms)) timeIso = new Date(ms).toISOString();
      else timeNatural = raw;
    }

    const reminder = {
      time_natural: typeof timeNatural === "string" && timeNatural.trim() ? timeNatural.trim() : null,
      time_iso: typeof timeIso === "string" && timeIso.trim() ? timeIso : null,
      reason: typeof reminderRaw.reason === "string" && reminderRaw.reason.trim() ? reminderRaw.reason.trim() : null,
    };

    const structured: any = {
      note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
      note_category: typeof parsed.note_category === "string" && parsed.note_category.trim() ? parsed.note_category.trim() : null,
      actions: Array.isArray(parsed.actions)
        ? parsed.actions.filter((a: any) => typeof a === "string" && a.trim()).map((a: string) => a.trim())
        : [],
      tasks,
      reminder,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null,

      reflection: typeof parsed.reflection === "string" && parsed.reflection.trim() ? parsed.reflection.trim() : null,
      emotional_state:
        typeof parsed.emotional_state === "string" && parsed.emotional_state.trim() ? parsed.emotional_state.trim() : null,
      grounding: typeof parsed.grounding === "string" && parsed.grounding.trim() ? parsed.grounding.trim() : null,
    };

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
      tz,
      nowUtcIso,
      todayLocalYmd,
    });
  } catch (err: any) {
    console.error("[voice-capture] Unexpected error:", err?.stack || err);
    // Return message to the client so you can see what actually failed
    return NextResponse.json(
      { ok: false, error: "Unexpected server error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
