"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";
import { useT } from "@/lib/useT";
import { useLanguage } from "@/app/components/LanguageProvider";

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 2000;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// 🔧 Helper: rough natural-language → ISO datetime for labels like “tomorrow morning”
function resolveNaturalDue(label: string): string | null {
  if (!label) return null;

  const text = label.toLowerCase();
  const now = new Date();

  // Base date = today 09:00
  let target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
    0,
    0,
    0
  );

  // --- Day offset ---
  if (text.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
  } else if (text.includes("next week")) {
    target.setDate(target.getDate() + 7);
  } else if (text.includes("today")) {
    // keep today
  } else if (text.includes("tonight")) {
    // tonight → today
  }

  // --- Time-of-day keywords ---
  if (text.includes("morning")) {
    // morning → 08:00
    target.setHours(8, 0, 0, 0);
  } else if (text.includes("noon")) {
    target.setHours(12, 0, 0, 0);
  } else if (text.includes("afternoon")) {
    target.setHours(15, 0, 0, 0);
  } else if (text.includes("evening") || text.includes("tonight")) {
    // evening → 20:00
    target.setHours(20, 0, 0, 0);
  }

  // --- Explicit times: “8am”, “8 pm”, “20:00” etc ---
  const timeMatch = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|\b(\d{1,2}):(\d{2})\b/
  );

  if (timeMatch) {
    let hour: number | null = null;
    let minute: number | null = null;

    if (timeMatch[1]) {
      // "8" or "8:30" with am/pm
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];

      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    } else if (timeMatch[4] && timeMatch[5]) {
      // "20:00" style
      hour = parseInt(timeMatch[4], 10);
      minute = parseInt(timeMatch[5], 10);
    }

    if (hour !== null && minute !== null) {
      target.setHours(hour, minute, 0, 0);
    }
  }

  // Return as UTC ISO
  return target.toISOString();
}

type SupabaseUser = {
  id: string;
  email?: string | null;
} | null;

type Note = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  ai_result?: string | null;
  created_at: string | null;
  category: string | null;
};

type AiMode = "summarize" | "bullets" | "rewrite";

// ✅ Normalized voice task suggestion shape for the UI + task creation
type VoiceTaskSuggestion = {
  title: string;
  dueIso: string | null; // machine-usable ISO datetime (UTC)
  dueLabel: string | null; // human-readable label for the UI
  priority?: "low" | "medium" | "high" | null;
};

// Shape returned by /api/voice/capture
type VoiceStructured = {
  note?: string | null;
  note_category?: string | null;
  actions?: string[];
  tasks?: {
    title?: string;
    due_natural?: string | null;
    due_iso?: string | null;
    priority?: "low" | "medium" | "high" | null;
  }[];
  reminder?: {
    time_natural?: string | null;
    time_iso?: string | null;
    reason?: string | null;
  } | null;
  summary?: string | null;
};

const NOTE_CATEGORIES = [
  "Work",
  "Personal",
  "Ideas",
  "Meeting Notes",
  "Study",
  "Journal",
  "Planning",
  "Research",
  "Other",
] as const;

// For translating category labels
const CATEGORY_KEY_MAP: Record<(typeof NOTE_CATEGORIES)[number], string> = {
  Work: "work",
  Personal: "personal",
  Ideas: "ideas",
  "Meeting Notes": "meeting",
  Study: "study",
  Journal: "journal",
  Planning: "planning",
  Research: "research",
  Other: "other",
};

// Theme-aware category badges
const noteCategoryStyles: Record<string, string> = {
  Work: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Personal:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Ideas:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  "Meeting Notes":
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Study:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Journal:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Planning:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Research:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Other:
    "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
};

type NoteAIGeneratedTask = {
  title: string;
  due_natural?: string | null;
  due_iso?: string | null;
  priority?: "low" | "medium" | "high" | null;
};

export default function NotesPage() {
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`notes.${key}`, fallback);
  const { lang: appLang } = useLanguage();
  const intlLocale = appLang || "en";
  const { track } = useAnalytics();
  const [user, setUser] = useState<SupabaseUser>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [newCategory, setNewCategory] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const [aiCountToday, setAiCountToday] = useState(0);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [billingLoading, setBillingLoading] = useState(false);

  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Smart title toggle
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true);

  // Voice capture mode toggle: "review" or "autosave"
  const [voiceMode, setVoiceMode] = useState<"review" | "autosave">("review");

  // For resetting voice capture after save / reset button
  const [voiceResetKey, setVoiceResetKey] = useState(0);

  // Voice / note → suggested tasks from AI (normalized)
  const [voiceSuggestedTasks, setVoiceSuggestedTasks] = useState<
    VoiceTaskSuggestion[]
  >([]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [voiceTasksMessage, setVoiceTasksMessage] = useState("");

  // ✅ Accordion state for notes (open/closed)
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);

  // 🆕 Loading state per-note for "Tasks from note"
  const [noteTasksLoadingId, setNoteTasksLoadingId] = useState<string | null>(
    null
  );

  function formatDateTime(input: string | number | Date) {
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "";
  }
}

  function toggleNoteOpen(id: string) {
    setOpenNoteIds((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  }

  function getCategoryLabel(value: string | null): string {
    if (!value) return "";
    const key = CATEGORY_KEY_MAP[value as (typeof NOTE_CATEGORIES)[number]];
    return key
      ? t(`category.${key}`, value)
      : value;
  }

  function handleShareNote(note: Note) {
    if (!note?.content) return;

    const textToCopy = `${note.content}\n\n— ${t(
  "share.signature",
  "shared from AI Productivity Hub"
)}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
      track("note_shared");
    });
  }

  function handleAskAssistantAboutNote(note: Note) {
    if (!note?.content) return;

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: note.content,
          hint: "Help me turn this note into 3 clear next actions.",
        },
      })
    );

    track("ask_ai_from_note");
  }

  // ✅ Reset current voice note (recording result) without saving
  function handleResetVoice() {
    setTitle("");
    setContent("");
    setNewCategory("");
    setVoiceSuggestedTasks([]);
    setVoiceTasksMessage("");
    setError("");
    setVoiceResetKey((prev) => prev + 1);
  }

  // When voice capture finishes, fill content/title/category and capture tasks
  function handleVoiceResult(payload: {
  rawText: string | null;
  structured: VoiceStructured | null;
}) {
  const structured = payload.structured;

  // 1) Note content + smart title
  if (structured && structured.note && typeof structured.note === "string") {
    const noteText = structured.note;
    setContent(noteText);

    if (!title.trim() && autoTitleEnabled) {
      const firstLine = noteText.trim().split("\n")[0];
      const maxLen = 60;
      const generated =
        firstLine.length <= maxLen
          ? firstLine
          : firstLine.slice(0, maxLen) + "…";
      setTitle(generated);
    }
  } else if (payload.rawText) {
    setContent(payload.rawText);
  }

  // 2) Smart category from AI (only if user hasn't chosen one)
  if (structured && structured.note_category && !newCategory) {
    const cat = structured.note_category;
    const allowedLower = NOTE_CATEGORIES.map((c) => c.toLowerCase());
    const idx = allowedLower.indexOf(cat.toLowerCase());
    if (idx >= 0) {
      setNewCategory(NOTE_CATEGORIES[idx]);
    } else if (cat.toLowerCase() === "other") {
      setNewCategory("Other");
    }
  }

  // 3) Normalize tasks into VoiceTaskSuggestion[] (with natural-language fallback → ISO)
  if (structured && Array.isArray(structured.tasks)) {
    const suggestions: VoiceTaskSuggestion[] = structured.tasks.map((task) => {
      const rawTitle =
        typeof task.title === "string" && task.title.trim()
          ? task.title.trim()
          : t("tasks.untitled", "(Untitled task)");

      let dueIso: string | null = null;
      let dueLabel: string | null = null;

      // 4) Prefer explicit ISO from the model
      if (typeof task.due_iso === "string" && task.due_iso.trim()) {
        dueIso = task.due_iso.trim();
        if (dueIso) {
          const parsed = Date.parse(dueIso);
          if (!Number.isNaN(parsed)) {
            dueLabel = formatDateTime(parsed);
          }
        }
      }

      // 5) If there's a natural-language due and no ISO, try to resolve it
      if (
        !dueIso &&
        typeof task.due_natural === "string" &&
        task.due_natural.trim()
      ) {
        const natural = task.due_natural.trim();

        // Try to convert phrases like "tomorrow morning" → ISO
        const resolved = resolveNaturalDue(natural);
        if (resolved) {
          dueIso = resolved;
          const parsed = Date.parse(resolved);
          if (!Number.isNaN(parsed)) {
            dueLabel = formatDateTime(parsed);
          }
        }

        // If we still don't have a label, use the natural text
        if (!dueLabel) {
          dueLabel = natural;
        }
      }

      return {
        title: rawTitle,
        dueIso,
        dueLabel,
        priority:
          task.priority === "low" ||
          task.priority === "medium" ||
          task.priority === "high"
            ? task.priority
            : null,
      };
    });

    const nonEmpty = suggestions.filter((s) => s.title.trim().length > 0);
    setVoiceSuggestedTasks(nonEmpty);
    setVoiceTasksMessage("");
  } else {
    setVoiceSuggestedTasks([]);
    setVoiceTasksMessage("");
  }
}

  // 🆕 Generate tasks from a note using backend AI endpoint
  async function handleGenerateTasksFromNote(note: Note) {
    if (!user) {
      setError(
        t(
          "errors.notLoggedInTasksFromNotes",
          "You need to be logged in to create tasks from notes."
        )
      );
      return;
    }
    if (!note.content?.trim()) return;

    setError("");
    setVoiceTasksMessage("");
    setNoteTasksLoadingId(note.id);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: note.id,
          content: note.content,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        console.error("[note-to-tasks] error:", data);
        setError(
          data?.error ||
            t(
              "errors.generateTasksFromNoteFailed",
              "Failed to generate tasks from this note. Try again."
            )
        );
        setNoteTasksLoadingId(null);
        return;
      }

      const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];

     const suggestions: VoiceTaskSuggestion[] = rawTasks.map((task: any) => {
  const rawTitle =
    typeof task.title === "string" && task.title.trim()
      ? task.title.trim()
      : t("tasks.untitled", "(Untitled task)");

  let dueIso: string | null = null;
  let dueLabel: string | null = null;

  // Prefer explicit ISO if provided
  if (typeof task.due_iso === "string" && task.due_iso.trim()) {
    dueIso = task.due_iso.trim();
    if (dueIso) {
      const parsed = Date.parse(dueIso);
      if (!Number.isNaN(parsed)) {
        dueLabel = new Date(parsed).toLocaleString();
      }
    }
  }

  // If no ISO, try to resolve natural language
  if (
    !dueIso &&
    typeof task.due_natural === "string" &&
    task.due_natural.trim()
  ) {
    const natural = task.due_natural.trim();
    const resolved = resolveNaturalDue(natural);
    if (resolved) {
      dueIso = resolved;
      const parsed = Date.parse(resolved);
      if (!Number.isNaN(parsed)) {
        dueLabel = new Date(parsed).toLocaleString();
      }
    }
    if (!dueLabel) {
      dueLabel = natural;
    }
  }

  return {
    title: rawTitle,
    dueIso,
    dueLabel,
    priority:
      task.priority === "low" ||
      task.priority === "medium" ||
      task.priority === "high"
        ? task.priority
        : null,
  };
});

      const nonEmpty = suggestions.filter((s) => s.title.trim().length > 0);
      setVoiceSuggestedTasks(nonEmpty);

      if (nonEmpty.length > 0) {
        setVoiceTasksMessage(
          t(
            "tasks.suggested.fromNote",
            "Generated task suggestions from the note."
          )
        );
      } else {
        setVoiceTasksMessage(
          t(
            "tasks.suggested.noneFound",
            "No clear tasks were found in this note."
          )
        );
      }
    } catch (err) {
      console.error("[note-to-tasks] unexpected error:", err);
      setError(
        t(
          "errors.generateTasksFromNoteUnexpected",
          "Unexpected error while generating tasks from this note."
        )
      );
    } finally {
      setNoteTasksLoadingId(null);
    }
  }

  // Load user
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setCheckingUser(false);
    }
    load();
  }, []);

  // Fetch profile (plan)
  async function ensureProfile() {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      const { data: inserted } = await supabase
        .from("profiles")
        .insert([{ id: user.id, email: user.email, plan: "free" }])
        .select("plan")
        .single();
      setPlan(inserted?.plan || "free");
    } else {
      setPlan(data.plan || "free");
    }
  }

  async function fetchNotes() {
    if (!user) return;

    setLoadingList(true);

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const rows = (data || []) as Note[];
      setNotes(rows);
      // Open the newest note by default, close others
      setOpenNoteIds(rows.length ? [rows[0].id] : []);
    }

    setLoadingList(false);
  }

  async function fetchAiUsage() {
    if (!user) return;

    const today = getTodayString();

    const { data } = await supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    setAiCountToday(data?.count || 0);
  }

  useEffect(() => {
    if (user) {
      ensureProfile();
      fetchNotes();
      fetchAiUsage();
    }
  }, [user]);

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

  async function handleSaveNote(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() && !content.trim()) {
      setError(
        t(
          "errors.saveNoteMissing",
          "Please enter a title or content."
        )
      );
      return;
    }

    setError("");

    let finalTitle = title;
    if (!finalTitle.trim() && autoTitleEnabled && content.trim()) {
      const firstLine = content.trim().split("\n")[0];
      const maxLen = 60;
      finalTitle =
        firstLine.length <= maxLen
          ? firstLine
          : firstLine.slice(0, maxLen) + "…";
    }

    setLoading(true);

    const createdAtIso = new Date(`${noteDate}T00:00:00.000Z`).toISOString();

    await supabase.from("notes").insert([
      {
        title: finalTitle || null,
        content,
        user_id: user.id,
        created_at: createdAtIso,
        category: newCategory || null,
      },
    ]);

    // Clear form & voice state
    setTitle("");
    setContent("");
    setNewCategory("");
    setVoiceResetKey((prev) => prev + 1);
    setVoiceSuggestedTasks([]);
    setVoiceTasksMessage("");

    await fetchNotes();
    track("note_created");

    setLoading(false);
  }

  async function incrementAiUsage() {
    if (!user) return aiCountToday;

    const today = getTodayString();

    const { data } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (!data) {
      await supabase.from("ai_usage").insert([
        { user_id: user.id, usage_date: today, count: 1 },
      ]);
      setAiCountToday(1);
      return 1;
    }

    const newCount = data.count + 1;

    await supabase
      .from("ai_usage")
      .update({ count: newCount })
      .eq("id", data.id);

    setAiCountToday(newCount);
    return newCount;
  }

  async function handleAI(
    noteId: string,
    noteContent: string | null,
    mode: AiMode
  ) {
    if (!noteContent?.trim()) return;

    if (!user) {
      setError(
        t(
          "errors.notLoggedInForAI",
          "You need to be logged in to use AI on notes."
        )
      );
      return;
    }

    if (remaining <= 0) {
      setError(
        t("errors.dailyLimitReached", "Daily AI limit reached.")
      );
      return;
    }

    setAiLoading(noteId);

    const res = await fetch("/api/ai/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent, mode }),
    });

    const data = await res.json();
    if (!data.result) {
      setError(
        t("errors.aiFailed", "AI failed.")
      );
      setAiLoading(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("notes")
      .update({ ai_result: data.result })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[notes] AI result update error", updateError);
      setError(
        t(
          "errors.aiSaveFailed",
          "Failed to save AI result to this note."
        )
      );
      setAiLoading(null);
      return;
    }

    const used = await incrementAiUsage();
    await fetchNotes();

    track("ai_call_used", { feature: `note_${mode}`, usedToday: used });

    setAiLoading(null);
  }

  function startEdit(note: Note) {
    setEditingNoteId(note.id);
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
    setEditCategory(note.category || "");
  }

  async function saveEdit(id: string) {
    if (!user) return;

    setSavingEditId(id);

    await supabase
      .from("notes")
      .update({
        title: editTitle,
        content: editContent,
        category: editCategory || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    setSavingEditId(null);
    cancelEdit();
    fetchNotes();
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (
      !confirm(
        t("confirm.deleteNote", "Delete this note?")
      )
    )
      return;

    setDeletingId(id);

    await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);

    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  }

  /// ✅ Create tasks from voiceSuggestedTasks with due date + time + reminders + category
  async function handleCreateTasksFromVoice() {
    if (!user) return;
    if (voiceSuggestedTasks.length === 0) return;

    setCreatingTasks(true);
    setError("");
    setVoiceTasksMessage("");

    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");

      const rows = voiceSuggestedTasks.map((t) => {
        let dueIso: string | null = t.dueIso || null;

        // If we don't have an explicit ISO but the label looks like a date, try parsing
        if (!dueIso && t.dueLabel) {
          const parsed = Date.parse(t.dueLabel);
          if (!Number.isNaN(parsed)) {
            dueIso = new Date(parsed).toISOString();
          } else {
            // Last fallback: try natural-language resolver
            const resolved = resolveNaturalDue(t.dueLabel);
            if (resolved) {
              dueIso = resolved;
            }
          }
        }

        let reminderAt: string | null = null;
        let timeFrom: string | null = null;
        let timeTo: string | null = null;
        let dueDateForColumn: string | null = null;

        if (dueIso) {
          const due = new Date(dueIso);

          // Store full ISO (tasks page slices date part for the datepicker)
          dueDateForColumn = dueIso;

          // Build local time_from / time_to from the due datetime
          const local = new Date(due); // local wall time
          const h = local.getHours();
          const m = local.getMinutes();

          timeFrom = `${pad(h)}:${pad(m)}`;
          const end = new Date(local.getTime() + 60 * 60 * 1000); // +1 hour slot
          timeTo = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

          // 🔥 ALWAYS set reminder if we have a dueIso
          reminderAt = dueIso;
        }

        const row: any = {
          user_id: user.id,
          title: t.title,
          description: null,
          completed: false,
          created_at: now.toISOString(),
          completed_at: null,

          // 🔹 Auto-suggest category from the note's category (if any)
          category: newCategory || null,

          // 🔹 Pre-fill time range in Tasks UI
          time_from: timeFrom,
          time_to: timeTo,

          // 🔹 Date picker value
          due_date: dueDateForColumn, // can be null if no usable date

          // 🔹 Reminders
          reminder_enabled: !!reminderAt,
          reminder_at: reminderAt,
          reminder_sent_at: null,
        };

        return row;
      });

      console.log("[voice-tasks] inserting rows:", rows);

      const { data, error } = await supabase
        .from("tasks")
        .insert(rows)
        .select(
          "id, due_date, reminder_enabled, reminder_at, time_from, time_to, category"
        );

      console.log("[voice-tasks] insert result:", { data, error });

      if (error) {
        let extra = "";
        try {
          extra = JSON.stringify(
            {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
            null,
            2
          );
        } catch {
          // ignore
        }

        console.error("[voice-tasks] insert error full:", error);
        setError(
          t(
            "errors.createTasksFromVoiceFailed",
            "Failed to create tasks from your note/voice:"
          ) +
            " " +
            (error.message || error.details || extra || "Unknown error")
        );
      } else {
        setVoiceTasksMessage(
          t(
            "tasks.voice.created",
            "Created tasks from your note/voice."
          )
        );
        setVoiceSuggestedTasks([]);
      }
    } catch (err) {
      console.error("[voice-tasks] unexpected error", err);
      setError(
        t(
          "errors.createTasksUnexpected",
          "Unexpected error while creating tasks (check console)."
        )
      );
    } finally {
      setCreatingTasks(false);
    }
  }

  /// ✅ Create tasks from an existing note (typed or saved) using AI
  async function handleCreateTasksFromNote(note: Note) {
    if (!user) return;
    if (!note.content || !note.content.trim()) {
      setError(
        t(
          "errors.noteEmptyForTasks",
          "This note is empty, nothing to turn into tasks."
        )
      );
      return;
    }

    setCreatingTasks(true);
    setError("");
    setVoiceTasksMessage("");

    try {
      // 1) Ask backend to extract tasks from the note
      const res = await fetch("/api/notes/to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: note.content,
          noteCategory: note.category || null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        console.error("[notes] note→tasks API error:", json);
        setError(
          json?.error ||
            t(
              "errors.generateTasksFromNoteFailed",
              "Failed to generate tasks from this note."
            )
        );
        return;
      }

      const tasksFromAI: NoteAIGeneratedTask[] = Array.isArray(json.tasks)
        ? json.tasks
        : [];

      if (tasksFromAI.length === 0) {
        setError(
          t(
            "errors.noTasksFoundInNote",
            "AI did not find any clear tasks in this note."
          )
        );
        return;
      }

      // 2) Insert into tasks table (similar logic as voice tasks)
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");

     const rows = tasksFromAI.map((task) => {
  let dueIso: string | null = task.due_iso || null;

  if (!dueIso && task.due_natural) {
    const parsed = Date.parse(task.due_natural);
    if (!Number.isNaN(parsed)) {
      dueIso = new Date(parsed).toISOString();
    }
  }

  let reminderAt: string | null = null;
  let timeFrom: string | null = null;
  let timeTo: string | null = null;
  let dueDateForColumn: string | null = null;

  if (dueIso) {
    const due = new Date(dueIso);
    dueDateForColumn = dueIso; // tasks page slices date part

    const local = new Date(due);
    const h = local.getHours();
    const m = local.getMinutes();

    const pad = (n: number) => n.toString().padStart(2, "0");

    timeFrom = `${pad(h)}:${pad(m)}`;
    const end = new Date(local.getTime() + 60 * 60 * 1000); // +1h
    timeTo = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60_000);
    if (due > oneMinuteFromNow) {
      reminderAt = dueIso;
    } else {
      reminderAt = null;
    }
  }

  return {
    user_id: user.id,
    title: task.title || t("tasks.untitled", "(Untitled task)"),
    description: null,
    completed: false,
    created_at: now.toISOString(),
    completed_at: null,

    // Use the note's category as a hint for the task
    category: note.category || null,

    time_from: timeFrom,
    time_to: timeTo,
    due_date: dueDateForColumn,

    reminder_enabled: !!reminderAt,
    reminder_at: reminderAt,
    reminder_sent_at: null,
  };
});

      const { data, error } = await supabase
        .from("tasks")
        .insert(rows)
        .select("id, title, due_date, time_from, time_to, reminder_at");

      if (error) {
        console.error("[notes] insert tasks from note error:", error);
        setError(
          t(
            "errors.saveTasksFromNoteFailed",
            "Failed to save tasks created from this note:"
          ) +
            " " +
            (error.message || error.details || "")
        );
        return;
      }

      console.log("[notes] tasks created from note:", data);

      setVoiceTasksMessage(
        t(
          "tasks.note.created",
          "Created tasks from this note."
        )
      );
    } catch (err) {
      console.error(
        "[notes] unexpected error in handleCreateTasksFromNote:",
        err
      );
      setError(
        t(
          "errors.createTasksFromNoteUnexpected",
          "Unexpected error while creating tasks from this note."
        )
      );
    } finally {
      setCreatingTasks(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">
          {t("checkingSession", "Checking session…")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">
          {t("title", "Notes")}
        </h1>

        <p className="text-[var(--text-muted)] mb-4 text-center max-w-md">
          {t(
            "loginRequired",
            "You must log in to view your notes."
          )}
        </p>

        <a
          href="/auth"
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
        >
          {t("loginButton", "Log in / Sign up")}
        </a>
      </main>
    );
  }

  const userId = user.id as string;

  const filteredNotes =
    categoryFilter === "all"
      ? notes
      : notes.filter((n) => (n.category || "") === categoryFilter);

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] p-4 md:p-8 pb-24">
      {/* pb-24 so bottom buttons (feedback) don't hide behind floating UI */}
      <AppHeader active="notes" />

      <div className="max-w-5xl mx-auto mt-6 grid gap-6 md:grid-cols-[1.2fr,1fr]">
        {/* CREATE NOTE */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">
                {t("create.heading", "Create a new note")}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {t(
                  "create.subheading",
                  "Use AI to summarize, bullet, or rewrite your notes. Capture ideas with your voice, too."
                )}
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
            >
              {t("create.logout", "Log out")}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-400 mb-3">{error}</div>
          )}

          <form onSubmit={handleSaveNote} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder={t("form.titlePlaceholder", "Note title")}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span>
                  {t("form.dateLabel", "Note date:")}
                </span>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span>
                  {t("form.categoryLabel", "Category:")}
                </span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                >
                  <option value="">
                    {t("form.category.none", "None")}
                  </option>
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(
                        `category.${CATEGORY_KEY_MAP[c]}`,
                        c
                      )}
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart title toggle */}
              <div className="flex items-center gap-1">
                <input
                  id="auto-title"
                  type="checkbox"
                  checked={autoTitleEnabled}
                  onChange={(e) => setAutoTitleEnabled(e.target.checked)}
                  className="h-3 w-3"
                />
                <label
                  htmlFor="auto-title"
                  className="cursor-pointer text-[11px]"
                >
                  {t(
                    "form.smartTitleLabel",
                    "Smart title from content"
                  )}
                </label>
              </div>
            </div>

            <textarea
              placeholder={t(
                "form.contentPlaceholder",
                "Write your note here..."
              )}
              className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex flex-col gap-2 text-[11px] text-[var(--text-muted)]">
              <span>
                {t("plan.label", "Plan")}:{" "}
                <span className="font-semibold">{plan}</span> •{" "}
                {t("plan.aiTodayLabel", "AI today")}:{" "}
                <span className="font-semibold">
                  {aiCountToday}/{dailyLimit}
                </span>
              </span>

              {/* Voice capture mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px]">
                  {t("voice.modeLabel", "Voice capture mode:")}
                </span>
                <button
                  type="button"
                  onClick={() => setVoiceMode("review")}
                  className={`px-2 py-1 rounded-full border text-[10px] ${
                    voiceMode === "review"
                      ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                  }`}
                >
                  {t("voice.mode.review", "Review first")}
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMode("autosave")}
                  className={`px-2 py-1 rounded-full border text-[10px] ${
                    voiceMode === "autosave"
                      ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                  }`}
                >
                  {t("voice.mode.autosave", "Auto-save note")}
                </button>
              </div>
            </div>

            {/* Voice capture + reset */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <VoiceCaptureButton
                userId={userId}
                mode={voiceMode}
                resetKey={voiceResetKey}
                onResult={handleVoiceResult}
              />
              {(content || title || voiceSuggestedTasks.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetVoice}
                  className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px] hover:bg-[var(--bg-card)]"
                >
                  {t("voice.resetButton", "Reset voice note")}
                </button>
              )}
            </div>

            {/* Suggested tasks (from voice or note) */}
            {voiceSuggestedTasks.length > 0 && (
              <div className="mt-3 border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)]/60 text-[11px]">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">
                    {t(
                      "tasks.suggested.title",
                      "Suggested tasks"
                    )}
                  </p>
                  {voiceTasksMessage && (
                    <span className="text-[10px] text-emerald-400">
                      {voiceTasksMessage}
                    </span>
                  )}
                </div>
                <ul className="list-disc pl-4 space-y-1 mb-2">
                  {voiceSuggestedTasks.map((tItem, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{tItem.title}</span>
                      {tItem.dueLabel && (
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          — {tItem.dueLabel}
                        </span>
                      )}
                      {tItem.priority && (
                        <span className="ml-1 uppercase text-[9px] text-[var(--text-muted)]">
                          [{tItem.priority}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleCreateTasksFromVoice}
                  disabled={creatingTasks}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-[11px] disabled:opacity-60"
                >
                  {creatingTasks
                    ? t(
                        "tasks.suggested.creating",
                        "Creating tasks…"
                      )
                    : t(
                        "tasks.suggested.createButton",
                        "Create tasks"
                      )}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm disabled:opacity-50"
            >
              {loading
                ? t("buttons.saveNoteLoading", "Saving...")
                : t("buttons.saveNote", "Save note")}
            </button>
          </form>

          {plan === "free" && (
            <div className="mt-3 text-[11px] text-[var(--text-muted)]">
              {t(
                "buttons.upgradeHint",
                "AI limit reached often?"
              )}{" "}
              <button
                disabled={billingLoading}
                onClick={() => {}}
                className="underline text-[var(--accent)]"
              >
                {t("buttons.upgradeToPro", "Upgrade to Pro")}
              </button>
            </div>
          )}
        </section>

        {/* NOTES LIST */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {t("list.title", "Your notes")}
            </h2>

            <div className="flex items-center gap-2 text-[11px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="all">
                  {t(
                    "list.filter.allCategories",
                    "All categories"
                  )}
                </option>
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(
                      `category.${CATEGORY_KEY_MAP[c]}`,
                      c
                    )}
                  </option>
                ))}
                <option value="">
                  {t(
                    "list.filter.noCategory",
                    "No category"
                  )}
                </option>
              </select>

              <button
                onClick={fetchNotes}
                className="text-sm px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                {t("list.refresh", "Refresh")}
              </button>
            </div>
          </div>

          {filteredNotes.length === 0 && !loadingList && (
            <p className="text-[var(--text-muted)] text-sm">
              {t("list.empty", "No notes found.")}
            </p>
          )}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const badge = noteCategoryStyles[note.category || "Other"];
              const isOpen = openNoteIds.includes(note.id);

              return (
                <article
                  key={note.id}
                  className="border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)]"
                >
                  {/* COLLAPSED / HEADER ROW */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => toggleNoteOpen(note.id)}
                        className="h-5 w-5 flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[10px] hover:bg-[var(--bg-elevated)]"
                        aria-label={
                          isOpen
                            ? t(
                                "list.aria.collapse",
                                "Collapse note"
                              )
                            : t(
                                "list.aria.expand",
                                "Expand note"
                              )
                        }
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>

                      <div className="flex-1 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-sm line-clamp-1">
                            {note.title ||
                              t("list.untitled", "Untitled")}
                          </h3>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {note.created_at ? formatDateTime(note.created_at) : ""}
                          </span>
                        </div>

                        {note.category && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${badge}`}
                          >
                            {getCategoryLabel(note.category)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EXPANDED VIEW */}
                  {!isEditing && isOpen && (
                    <>
                      {note.content && (
                        <p className="mt-2 text-xs text-[var(--text-main)] whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}

// The rest of the note’s expanded view …

                      <div className="mt-3 flex flex-wrap gap-2">
                        {/* 🆕 Tasks from note (suggestions in panel) */}
                        <button
                          onClick={() => handleGenerateTasksFromNote(note)}
                          disabled={noteTasksLoadingId === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {noteTasksLoadingId === note.id
                            ? t(
                                "buttons.tasksFromNoteLoading",
                                "Finding tasks..."
                              )
                            : t(
                                "buttons.tasksFromNote",
                                "⚡ Tasks from note"
                              )}
                        </button>

                        {/* AI Buttons */}
                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "summarize")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {aiLoading === note.id
                            ? t(
                                "buttons.summarizeLoading",
                                "Summarizing..."
                              )
                            : t(
                                "buttons.summarize",
                                "✨ Summarize"
                              )}
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "bullets")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {t("buttons.bullets", "📋 Bullets")}
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "rewrite")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {t("buttons.rewrite", "✍️ Rewrite")}
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => handleShareNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {copiedNoteId === note.id
                            ? t(
                                "buttons.shareCopied",
                                "✅ Copied"
                              )
                            : t("buttons.share", "Share")}
                        </button>

                        <button
                          onClick={() => handleAskAssistantAboutNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {t("buttons.askAI", "🤖 Ask AI")}
                        </button>

                        {/* 🧩 NEW: Directly create tasks from this note */}
                        <button
                          onClick={() => handleCreateTasksFromNote(note)}
                          disabled={creatingTasks}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {creatingTasks
                            ? t(
                                "buttons.tasksCreateFromNoteLoading",
                                "Creating tasks…"
                              )
                            : t(
                                "buttons.tasksCreateFromNote",
                                "🧩 Tasks"
                              )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {t("buttons.edit", "✏️ Edit")}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="px-2 py-1 rounded-lg border border-red-500 text-red-400 hover:bg-red-900/30 text-[11px]"
                        >
                          {deletingId === note.id
                            ? t(
                                "buttons.deleteLoading",
                                "Deleting..."
                              )
                            : t(
                                "buttons.delete",
                                "🗑 Delete"
                              )}
                        </button>
                      </div>

                      {note.ai_result && (
                        <div className="mt-3 text-xs text-[var(--text-main)] border-t border-[var(--border-subtle)] pt-2 whitespace-pre-wrap">
                          <strong>
                            {t(
                              "list.aiResultTitle",
                              "AI Result:"
                            )}
                          </strong>
                          <br />
                          {note.ai_result}
                        </div>
                      )}
                    </>
                  )}

                  {/* EDITING */}
                  {isEditing && (
                    <div className="mt-2 space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />

                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="">
                          {t(
                            "list.filter.noCategory",
                            "No category"
                          )}
                        </option>
                        {NOTE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {t(
                              `category.${CATEGORY_KEY_MAP[c]}`,
                              c
                            )}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[100px] px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(note.id)}
                          disabled={savingEditId === note.id}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-xs disabled:opacity-60"
                        >
                          {savingEditId === note.id
                            ? t(
                                "buttons.editSaveLoading",
                                "Saving..."
                              )
                            : t("buttons.editSave", "Save")}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
                        >
                          {t("buttons.editCancel", "Cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-4 text-[11px] flex gap-3 text-[var(--text-muted)]">
            <Link href="/tasks" className="hover:text-[var(--accent)]">
              {t("list.goToTasks", "→ Go to Tasks")}
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--accent)]">
              {t("list.openDashboard", "Open Dashboard")}
            </Link>
          </div>

          {/* Feedback form, centered + with extra bottom padding (handled by main) */}
          <section className="mt-6">
            <div className="max-w-md mx-auto">
              <FeedbackForm user={user} />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
