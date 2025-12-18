import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Change this if you want to support multiple user timezones later.
// For now you said your app timezone is Europe/Athens.
const DEFAULT_TZ = "Europe/Athens";

function getNowContext(timeZone: string) {
  const now = new Date();

  // A human-friendly "local now" string for the model (in the target timezone)
  const nowLocal = now.toLocaleString("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Also give ISO UTC explicitly
  const nowUtcIso = now.toISOString();

  // Give "local date" (YYYY-MM-DD) in that timezone (helps with "tomorrow")
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

    // ✅ support 3 modes:
    // - review (default)
    // - autosave (current behavior)
    // - psych (new reflection companion behavior)
    const modeRaw = (formData.get("mode") as string | null) || "review";
    const mode =
      modeRaw === "autosave" ? "autosave" : modeRaw === "psych" ? "psych" : "review";

    // Optional: allow passing tz from client later
    const tz = (formData.get("tz") as string | null) || DEFAULT_TZ;

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
      model: "whisper-1",
    });

    const rawText = transcription.text?.trim() || "";
    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "Transcription is empty" },
        { status: 500 }
      );
    }

    // ✅ Provide strong “now” context to stop wrong relative dates (“tomorrow” etc.)
    const { nowUtcIso, nowLocal, todayLocalYmd } = getNowContext(tz);

    // 2) 🤖 System prompt (two variants: productivity vs reflection companion)
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
      "title": string,              // in the user's language
      "due_natural": string | null, // e.g. "αύριο το πρωί", "around 8pm"
      "due_iso": string | null,     // ISO 8601 UTC datetime, e.g. "2025-12-10T09:00:00Z"
      "priority": "low" | "medium" | "high" | null
    }
- "reminder": an object
    {
      "time_natural": string | null,
      "time_iso": string | null,     // ISO 8601 UTC datetime, or null
      "reason": string | null
    }
- "summary": 1–2 sentence summary (string, in the user's language)

Rules:
- Interpret relative dates ("today", "tomorrow", "next week") using the TIME CONTEXT above.
- If the user clearly gives a precise date/time, fill ISO fields with correct UTC ISO 8601.
- If the time/date is vague or not clearly stated, set the ISO field to null and ONLY use the "..._natural" field.
- Do NOT invent exact times or dates if the user didn't clearly specify them.
- Keep the JSON well-formed and valid.
- Return ONLY valid JSON – no markdown, no commentary, no backticks.
`.trim();

    const psychPrompt = `
You are a supportive AI reflection companion (NOT a therapist).

GOAL:
- Help the user reflect on their thoughts and feelings.
- Respond with empathy and clarity.
- Suggest small, practical next steps only if appropriate.

STRICT RULES:
- Do NOT diagnose mental health conditions.
- Do NOT claim medical or therapeutic authority.
- Do NOT say you are a therapist.
- Do NOT encourage dependency.
- If the user expresses self-harm intent, imminent danger, or severe crisis: respond calmly, encourage reaching out to local emergency services or a trusted person, and do not provide harmful instructions.

LANGUAGE:
- Detect the user's language from the transcript.
- Write ALL HUMAN-TEXT FIELDS in that language.
- JSON KEYS must stay in English exactly as specified below.

TIME CONTEXT (for "today/tomorrow" tasks if mentioned):
- User timezone: ${tz}
- Current local date/time in that timezone: ${nowLocal}
- Today's local date (YYYY-MM-DD): ${todayLocalYmd}
- Current UTC ISO: ${nowUtcIso}

Return ONLY a JSON object with these keys (omit any that do not apply):
{
  "reflection": string,          // 2–5 sentences, empathetic + clarifying
  "emotional_state": string|null,// optional simple label like "stressed", "overwhelmed"
  "grounding": string|null,      // optional short grounding suggestion (breath, tiny step)
  "note": string|null,           // optional clean note of what user said
  "tasks": [
    {
      "title": string,
      "due_natural": string|null,
      "due_iso": string|null,
      "priority": "low"|"medium"|"high"|null
    }
  ],
  "summary": string|null
}

Rules:
- Interpret relative dates using TIME CONTEXT above.
- Only output tasks if the user actually wants actions or mentions commitments.
- Do NOT invent exact times/dates.
- Return ONLY valid JSON. No markdown.
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

    // 3) ✅ Normalize tasks/reminder shape so frontend always sees consistent fields
    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t: any) => {
          const title = typeof t.title === "string" ? t.title : "";

          let dueIso = t.due_iso ?? null;
          let dueNatural = t.due_natural ?? null;

          // backwards compatibility: if model ever returns "due"
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
            due_iso: typeof dueIso === "string" && dueIso.trim() ? dueIso : null,
            priority:
              t.priority === "low" || t.priority === "medium" || t.priority === "high"
                ? t.priority
                : null,
          };
        })
      : [];

    // reminder only really applies in productivity mode, but we keep it for compatibility
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
      time_natural:
        typeof timeNatural === "string" && timeNatural.trim()
          ? timeNatural.trim()
          : null,
      time_iso: typeof timeIso === "string" && timeIso.trim() ? timeIso : null,
      reason:
        typeof reminderRaw.reason === "string" && reminderRaw.reason.trim()
          ? reminderRaw.reason.trim()
          : null,
    };

    // ✅ Build structured response
    const structured: any = {
      // productivity keys
      note:
        typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
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
        typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null,

      // psych keys (safe optional)
      reflection:
        typeof parsed.reflection === "string" && parsed.reflection.trim()
          ? parsed.reflection.trim()
          : null,
      emotional_state:
        typeof parsed.emotional_state === "string" && parsed.emotional_state.trim()
          ? parsed.emotional_state.trim()
          : null,
      grounding:
        typeof parsed.grounding === "string" && parsed.grounding.trim()
          ? parsed.grounding.trim()
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
      tz,
      nowUtcIso,
      todayLocalYmd,
    });
  } catch (err) {
    console.error("[voice-capture] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
