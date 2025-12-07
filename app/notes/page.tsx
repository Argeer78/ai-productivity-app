"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
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

type VoiceTaskSuggestion = {
  title: string;
  due: string | null;
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

export default function NotesPage() {
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

  // For resetting voice capture after save
  const [voiceResetKey, setVoiceResetKey] = useState(0);

  // 🆕 Voice → suggested tasks from AI
  const [voiceSuggestedTasks, setVoiceSuggestedTasks] = useState<
    VoiceTaskSuggestion[]
  >([]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [voiceTasksMessage, setVoiceTasksMessage] = useState("");

  function handleShareNote(note: Note) {
    if (!note?.content) return;

    const textToCopy = `${note.content}\n\n— shared from AI Productivity Hub`;

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

  // 🆕 When voice capture finishes, fill content/title and capture tasks
  function handleVoiceResult(payload: {
    rawText: string | null;
    structured: {
      note?: string;
      tasks?: VoiceTaskSuggestion[];
    } | null;
  }) {
    const structured = payload.structured;

    if (structured && structured.note && typeof structured.note === "string") {
      const noteText = structured.note;
      setContent(noteText);

      // Smart title from first line if user hasn't typed one
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
      // Fallback if no structured note is present
      setContent(payload.rawText);
    }

    // Capture suggested tasks (if any)
    if (structured && Array.isArray(structured.tasks)) {
      setVoiceSuggestedTasks(structured.tasks);
      setVoiceTasksMessage("");
    } else {
      setVoiceSuggestedTasks([]);
      setVoiceTasksMessage("");
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

    if (!error) setNotes(data || []);

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

    // Need at least title OR content
    if (!title.trim() && !content.trim()) {
      setError("Please enter a title or content.");
      return;
    }

    setError("");

    // Smart title: if title empty, toggle ON, and we have content → generate from first line
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

    await supabase.from("ai_usage").update({ count: newCount }).eq("id", data.id);

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
      setError("You need to be logged in to use AI on notes.");
      return;
    }

    if (remaining <= 0) {
      setError("Daily AI limit reached.");
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
      setError("AI failed.");
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
      setError("Failed to save AI result to this note.");
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
    if (!confirm("Delete this note?")) return;

    setDeletingId(id);

    await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);

    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  }

  // 🆕 Create tasks from voiceSuggestedTasks
  async function handleCreateTasksFromVoice() {
  if (!user) return;
  if (voiceSuggestedTasks.length === 0) return;

  setCreatingTasks(true);
  setError("");
  setVoiceTasksMessage("");

  try {
    const nowIso = new Date().toISOString();

    const rows = voiceSuggestedTasks.map((t) => {
      let dueIso: string | null = null;

      // Only set due_date if it's a valid date string
      if (t.due && !Number.isNaN(Date.parse(t.due))) {
        dueIso = new Date(t.due).toISOString();
      }

      const row: any = {
        user_id: user.id,
        title: t.title,
        description: null,
        completed: false,
        created_at: nowIso,
        completed_at: null,
        category: null,
        time_from: null,
        time_to: null,
        reminder_enabled: false,
        reminder_at: null,
        reminder_sent_at: null,
      };

      if (dueIso) {
        row.due_date = dueIso;
      } else {
        row.due_date = null;
      }

      return row;
    });

    console.log("[voice-tasks] inserting rows:", rows);

    const { data, error } = await supabase
      .from("tasks")
      .insert(rows)
      .select("id");

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
        "Failed to create tasks from your voice note: " +
          (error.message || error.details || extra || "Unknown error")
      );
    } else {
      setVoiceTasksMessage(
        `Created ${rows.length} tasks from your voice note.`
      );
      setVoiceSuggestedTasks([]);
      track("voice_tasks_created", { count: rows.length });
    }
  } catch (err) {
    console.error("[voice-tasks] unexpected error", err);
    setError("Unexpected error while creating tasks (check console).");
  } finally {
    setCreatingTasks(false);
  }
}

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Checking session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">Notes</h1>
        <p className="text-[var(--text-muted)] mb-4 text-center max-w-md">
          You must log in to view your notes.
        </p>
        <a
          href="/auth"
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
        >
          Log in / Sign up
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
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] p-4 md:p-8">
      <AppHeader active="notes" />

      <div className="max-w-5xl mx-auto mt-6 grid gap-6 md:grid-cols-[1.2fr,1fr]">
        {/* CREATE NOTE */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Create a new note</h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Use AI to summarize, bullet, or rewrite your notes. Capture ideas
                with your voice, too.
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
            >
              Log out
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-400 mb-3">{error}</div>
          )}

          <form onSubmit={handleSaveNote} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Note title"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span>Note date:</span>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span>Category:</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                >
                  <option value="">None</option>
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
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
                  Smart title from content
                </label>
              </div>
            </div>

            <textarea
              placeholder="Write your note here..."
              className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex flex-col gap-2 text-[11px] text-[var(--text-muted)]">
              <span>
                Plan: <span className="font-semibold">{plan}</span> • AI today:{" "}
                <span className="font-semibold">
                  {aiCountToday}/{dailyLimit}
                </span>
              </span>

              {/* Voice capture mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px]">Voice capture mode:</span>
                <button
                  type="button"
                  onClick={() => setVoiceMode("review")}
                  className={`px-2 py-1 rounded-full border text-[10px] ${
                    voiceMode === "review"
                      ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                  }`}
                >
                  Review first
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
                  Auto-save note
                </button>
              </div>
            </div>

            {/* Voice capture */}
            <div className="mt-2">
              <VoiceCaptureButton
                userId={userId}
                mode={voiceMode}
                resetKey={voiceResetKey}
                onResult={handleVoiceResult}
              />
            </div>

            {/* 🆕 Suggested tasks from voice */}
            {voiceSuggestedTasks.length > 0 && (
              <div className="mt-3 border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)]/60 text-[11px]">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">
                    Suggested tasks from your voice note
                  </p>
                  {voiceTasksMessage && (
                    <span className="text-[10px] text-emerald-400">
                      {voiceTasksMessage}
                    </span>
                  )}
                </div>
                <ul className="list-disc pl-4 space-y-1 mb-2">
                  {voiceSuggestedTasks.map((t, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{t.title}</span>
                      {t.due && (
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          — {t.due}
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
                    ? "Creating tasks…"
                    : `Create ${voiceSuggestedTasks.length} task${
                        voiceSuggestedTasks.length > 1 ? "s" : ""
                      }`}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save note"}
            </button>
          </form>

          {plan === "free" && (
            <div className="mt-3 text-[11px] text-[var(--text-muted)]">
              AI limit reached often?{" "}
              <button
                disabled={billingLoading}
                onClick={() => {}}
                className="underline text-[var(--accent)]"
              >
                Upgrade to Pro
              </button>
            </div>
          )}
        </section>

        {/* NOTES LIST */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your notes</h2>

            <div className="flex items-center gap-2 text-[11px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="all">All categories</option>
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="">No category</option>
              </select>

              <button
                onClick={fetchNotes}
                className="text-sm px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                Refresh
              </button>
            </div>
          </div>

          {filteredNotes.length === 0 && !loadingList && (
            <p className="text-[var(--text-muted)] text-sm">
              No notes found.
            </p>
          )}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const badge = noteCategoryStyles[note.category || "Other"];

              return (
                <article
                  key={note.id}
                  className="border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)]"
                >
                  {!isEditing && (
                    <>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm">
                          {note.title || "Untitled"}
                        </h3>
                        {note.category && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${badge}`}
                          >
                            {note.category}
                          </span>
                        )}
                      </div>

                      {note.content && (
                        <p className="text-xs text-[var(--text-main)] whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleString()
                          : ""}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {/* AI Buttons */}
                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "summarize")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {aiLoading === note.id
                            ? "Summarizing..."
                            : "✨ Summarize"}
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "bullets")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          📋 Bullets
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "rewrite")
                          }
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          ✍️ Rewrite
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => handleShareNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {copiedNoteId === note.id
                            ? "✅ Copied"
                            : "Share"}
                        </button>

                        <button
                          onClick={() => handleAskAssistantAboutNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          🤖 Ask AI
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          ✏️ Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="px-2 py-1 rounded-lg border border-red-500 text-red-400 hover:bg-red-900/30 text-[11px]"
                        >
                          {deletingId === note.id
                            ? "Deleting..."
                            : "🗑 Delete"}
                        </button>
                      </div>

                      {note.ai_result && (
                        <div className="mt-3 text-xs text-[var(--text-main)] border-t border-[var(--border-subtle)] pt-2 whitespace-pre-wrap">
                          <strong>AI Result:</strong>
                          <br />
                          {note.ai_result}
                        </div>
                      )}
                    </>
                  )}

                  {/* EDITING */}
                  {isEditing && (
                    <div className="space-y-3">
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
                        <option value="">No category</option>
                        {NOTE_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
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
                            ? "Saving..."
                            : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
                        >
                          Cancel
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
              → Go to Tasks
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--accent)]">
              Open Dashboard
            </Link>
          </div>

          <div className="mt-4">
            <FeedbackForm user={user} />
          </div>
        </section>
      </div>
    </main>
  );
}
