"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";
import { useT } from "@/lib/useT";
import { useLanguage } from "@/app/components/LanguageProvider";
import Alive3DImage from "@/app/components/Alive3DImage";

const FREE_DAILY_LIMIT = 10;
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
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

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
    target.setHours(8, 0, 0, 0);
  } else if (text.includes("noon")) {
    target.setHours(12, 0, 0, 0);
  } else if (text.includes("afternoon")) {
    target.setHours(15, 0, 0, 0);
  } else if (text.includes("evening") || text.includes("tonight")) {
    target.setHours(20, 0, 0, 0);
  }

  // --- Explicit times: “8am”, “8 pm”, “20:00” etc ---
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|\b(\d{1,2}):(\d{2})\b/);

  if (timeMatch) {
    let hour: number | null = null;
    let minute: number | null = null;

    if (timeMatch[1]) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];

      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    } else if (timeMatch[4] && timeMatch[5]) {
      hour = parseInt(timeMatch[4], 10);
      minute = parseInt(timeMatch[5], 10);
    }

    if (hour !== null && minute !== null) {
      target.setHours(hour, minute, 0, 0);
    }
  }

  return target.toISOString();
}

type SupabaseUser =
  | {
    id: string;
    email?: string | null;
  }
  | null;

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

// ✅ Normalized task suggestion shape for the UI + task creation
type VoiceTaskSuggestion = {
  title: string;
  dueIso: string | null;
  dueLabel: string | null;
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
  reminder?:
  | {
    time_natural?: string | null;
    time_iso?: string | null;
    reason?: string | null;
  }
  | null;
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

const noteCategoryStyles: Record<string, string> = {
  Work: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Personal: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Ideas: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  "Meeting Notes": "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Study: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Journal: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Planning: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Research: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Other: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
};

// ✅ Must match tasks table allowed values
const TASK_CATEGORIES = ["Work", "Personal", "Health", "Study", "Errands", "Home", "Travel", "Other"] as const;
type TaskCategory = (typeof TASK_CATEGORIES)[number];

function normalizeTaskCategory(input: string | null): TaskCategory | null {
  if (!input) return null;

  if ((TASK_CATEGORIES as readonly string[]).includes(input)) {
    return input as TaskCategory;
  }

  const map: Record<string, TaskCategory> = {
    "Meeting Notes": "Work",
    Ideas: "Work",
    Planning: "Work",
    Research: "Study",
    Journal: "Personal",
  };

  return map[input] ?? "Other";
}

async function safeReadJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Non-JSON response (${res.status}).`, _raw: text?.slice(0, 500) };
  }
}

// --- Demo notes for visitors ---
const DEMO_NOTES: Note[] = [
  {
    id: "demo-1",
    user_id: "visitor",
    title: "Welcome to Notes (demo)",
    content:
      "This is a preview of how Notes works.\n\nTry clicking “✨ Summarize” or typing in the editor — you’ll get a login/signup popup.",
    created_at: new Date().toISOString(),
    category: "Journal",
    ai_result: null,
  },
  {
    id: "demo-2",
    user_id: "visitor",
    title: "Meeting notes (example)",
    content:
      "Client call:\n- Main goal: redesign onboarding\n- Pain points: too many steps, unclear pricing\n- Next: propose 2 flows + quick wireframe\n",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    category: "Meeting Notes",
    ai_result: "AI result preview will show here after you use an AI action (requires login).",
  },
];

function AuthGateModal({
  open,
  onClose,
  title = "Log in to continue",
  subtitle = "Create an account to write, save, or use AI.",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold break-words">{title}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 break-words">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href="/auth"
            className="flex-1 text-center px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            Log in / Sign up
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
          >
            Not now
          </button>
        </div>

        <p className="mt-3 text-[10px] text-[var(--text-muted)]">You can still browse this page as a visitor.</p>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const router = useRouter();
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`notes.${key}`, fallback);
  const { lang: appLang } = useLanguage();
  const intlLocale = appLang || "en";
  const { track } = useAnalytics();

  const [user, setUser] = useState<SupabaseUser>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // Auth gate modal (visitor → popup)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  function requireAuth(action?: () => void) {
    if (!user) {
      setAuthModalOpen(true);
      track?.("auth_gate_opened", { page: "notes" });
      return false;
    }
    action?.();
    return true;
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
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
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "alpha_asc" | "alpha_desc">("created_desc");

  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState<"review" | "autosave">("review");
  const [voiceResetKey, setVoiceResetKey] = useState(0);

  // ✅ One suggestion bucket used by BOTH voice + note
  const [voiceSuggestedTasks, setVoiceSuggestedTasks] = useState<VoiceTaskSuggestion[]>([]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [voiceTasksMessage, setVoiceTasksMessage] = useState("");

  // Category to apply when creating tasks from suggestions
  const [tasksSourceCategory, setTasksSourceCategory] = useState<TaskCategory | null>(null);

  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [noteTasksLoadingId, setNoteTasksLoadingId] = useState<string | null>(null);

  function formatDateTime(input: string | number | Date) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch {
      return "";
    }
  }

  function toggleNoteOpen(id: string) {
    setOpenNoteIds((prev) => (prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]));
  }

  function getCategoryLabel(value: string | null): string {
    if (!value) return "";
    const key = CATEGORY_KEY_MAP[value as (typeof NOTE_CATEGORIES)[number]];
    return key ? t(`category.${key}`, value) : value;
  }

  function handleShareNote(note: Note) {
    if (!note?.content) return;

    const textToCopy = `${note.content}\n\n— ${t("share.signature", "shared from AI Productivity Hub")}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
      track("note_shared");
    });
  }

  function handleAskAssistantAboutNote(note: Note) {
    if (!requireAuth()) return;
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

  function handleResetVoice() {
    setTitle("");
    setContent("");
    setNewCategory("");
    setVoiceSuggestedTasks([]);
    setVoiceTasksMessage("");
    setTasksSourceCategory(null);
    setError("");
    setVoiceResetKey((prev) => prev + 1);
  }

  function handleVoiceResult(payload: { rawText: string | null; structured: VoiceStructured | null }) {
    if (!requireAuth()) return;

    const structured = payload.structured;

    if (structured && structured.note && typeof structured.note === "string") {
      const noteText = structured.note;
      setContent(noteText);

      if (!title.trim() && autoTitleEnabled) {
        const firstLine = noteText.trim().split("\n")[0];
        const maxLen = 60;
        setTitle(firstLine.length <= maxLen ? firstLine : firstLine.slice(0, maxLen) + "…");
      }
    } else if (payload.rawText) {
      setContent(payload.rawText);
    }

    if (structured && structured.note_category && !newCategory) {
      const cat = structured.note_category;
      const allowedLower = NOTE_CATEGORIES.map((c) => c.toLowerCase());
      const idx = allowedLower.indexOf(cat.toLowerCase());
      if (idx >= 0) {
        setNewCategory(NOTE_CATEGORIES[idx]);
        setTasksSourceCategory(normalizeTaskCategory(NOTE_CATEGORIES[idx]));
      } else if (cat.toLowerCase() === "other") {
        setNewCategory("Other");
        setTasksSourceCategory(normalizeTaskCategory("Other"));
      }
    } else {
      const maybe = normalizeTaskCategory(newCategory || null);
      if (maybe) setTasksSourceCategory(maybe);
    }

    if (structured && Array.isArray(structured.tasks)) {
      const suggestions: VoiceTaskSuggestion[] = structured.tasks.map((t) => {
        const rawTitle = typeof t.title === "string" && t.title.trim() ? t.title.trim() : "(Untitled task)";

        let dueIso: string | null = null;
        let dueLabel: string | null = null;

        if (typeof t.due_iso === "string" && t.due_iso.trim()) {
          dueIso = t.due_iso.trim();
          if (dueIso) {
            const parsed = Date.parse(dueIso);
            if (!Number.isNaN(parsed)) {
              dueLabel = new Date(parsed).toLocaleString();
            }
          }
        }

        if (!dueIso && typeof t.due_natural === "string" && t.due_natural.trim()) {
          const natural = t.due_natural.trim();
          const resolved = resolveNaturalDue(natural);
          if (resolved) {
            dueIso = resolved;
            const parsed = Date.parse(resolved);
            if (!Number.isNaN(parsed)) {
              dueLabel = new Date(parsed).toLocaleString();
            }
          }
          if (!dueLabel) dueLabel = natural;
        }

        return {
          title: rawTitle,
          dueIso,
          dueLabel,
          priority: t.priority === "low" || t.priority === "medium" || t.priority === "high" ? t.priority : null,
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
  async function handleGenerateTasksFromNote(note: Note) {
    if (!requireAuth()) return;
    if (!note.content?.trim()) return;

    setError("");
    setNoteTasksLoadingId(note.id);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.content }),
      });

      const data = await safeReadJson(res);

      if (!res.ok || !data?.ok) {
        console.error("[note-to-tasks] error:", data);
        setError(data?.error || "Failed to generate tasks from note.");
        return;
      }

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const rows = tasks
        .map((t: any) => ({
          user_id: (user as any)!.id,
          title: typeof t.title === "string" ? t.title.trim() : "",
          completed: false,
          category: note.category || null,
        }))
        .filter((r: any) => r.title.length > 0);

      if (rows.length === 0) {
        setError("AI did not find any clear tasks in this note.");
        return;
      }

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        console.error("[tasks-from-note] insert error:", insertError);
        setError(insertError.message || "Failed to create tasks.");
        return;
      }

      router.push("/tasks");
    } catch (err) {
      console.error("[tasks-from-note] unexpected:", err);
      setError("Unexpected error while creating tasks.");
    } finally {
      setNoteTasksLoadingId(null);
    }
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setCheckingUser(false);
    }
    load();
  }, []);

  async function ensureProfile() {
    if (!user) return;

    const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();

    if (!data) {
      const { data: inserted } = await supabase
        .from("profiles")
        .insert([{ id: user.id, email: user.email, plan: "free" }])
        .select("plan")
        .single();
      setPlan(inserted?.plan || "free");
    } else {
      setPlan((data as any).plan || "free");
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

    setAiCountToday((data as any)?.count || 0);
  }

  useEffect(() => {
    if (user) {
      ensureProfile();
      fetchNotes();
      fetchAiUsage();
    } else {
      setNotes(DEMO_NOTES);
      setOpenNoteIds(DEMO_NOTES.length ? [DEMO_NOTES[0].id] : []);
      setPlan("free");
      setAiCountToday(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

  async function handleSaveNote(e: FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;

    if (!title.trim() && !content.trim()) {
      setError(t("errors.saveNoteMissing", "Please enter a title or content."));
      return;
    }

    setError("");

    let finalTitle = title;
    if (!finalTitle.trim() && autoTitleEnabled && content.trim()) {
      const firstLine = content.trim().split("\n")[0];
      const maxLen = 60;
      finalTitle = firstLine.length <= maxLen ? firstLine : firstLine.slice(0, maxLen) + "…";
    }

    setLoading(true);

    const createdAtIso = new Date(`${noteDate}T00:00:00.000Z`).toISOString();

    await supabase.from("notes").insert([
      {
        title: finalTitle || null,
        content,
        user_id: user!.id,
        created_at: createdAtIso,
        category: newCategory || null,
      },
    ]);

    setTitle("");
    setContent("");
    setNewCategory("");
    setVoiceResetKey((prev) => prev + 1);
    setVoiceSuggestedTasks([]);
    setVoiceTasksMessage("");
    setTasksSourceCategory(null);

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
      await supabase.from("ai_usage").insert([{ user_id: user.id, usage_date: today, count: 1 }]);
      setAiCountToday(1);
      return 1;
    }

    const newCount = (data as any).count + 1;
    await supabase.from("ai_usage").update({ count: newCount }).eq("id", (data as any).id);
    setAiCountToday(newCount);
    return newCount;
  }

  async function handleAI(noteId: string, noteContent: string | null, mode: AiMode) {
    if (!requireAuth()) return;
    if (!noteContent?.trim()) return;

    if (remaining <= 0) {
      setError(t("errors.dailyLimitReached", "Daily AI limit reached."));
      return;
    }

    setAiLoading(noteId);

    const res = await fetch("/api/ai/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent, mode }),
    });

    const data = await safeReadJson(res);
    if (!data?.result) {
      setError(t("errors.aiFailed", "AI failed."));
      setAiLoading(null);
      return;
    }

    const { error: updateError } = await supabase.from("notes").update({ ai_result: data.result }).eq("id", noteId).eq("user_id", user!.id);

    if (updateError) {
      console.error("[notes] AI result update error", updateError);
      setError(t("errors.aiSaveFailed", "Failed to save AI result to this note."));
      setAiLoading(null);
      return;
    }

    const used = await incrementAiUsage();
    await fetchNotes();

    track("ai_call_used", { feature: `note_${mode}`, usedToday: used });

    setAiLoading(null);
  }

  function startEdit(note: Note) {
    if (!requireAuth()) return;
    setEditingNoteId(note.id);
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
    setEditCategory(note.category || "");
  }

  async function saveEdit(id: string) {
    if (!requireAuth()) return;

    setSavingEditId(id);

    await supabase
      .from("notes")
      .update({ title: editTitle, content: editContent, category: editCategory || null })
      .eq("id", id)
      .eq("user_id", user!.id);

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
    if (!requireAuth()) return;
    if (!confirm(t("confirm.deleteNote", "Delete this note?"))) return;

    setDeletingId(id);
    await supabase.from("notes").delete().eq("id", id).eq("user_id", user!.id);

    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  }

  async function handleCreateTasksFromVoice() {
    if (!requireAuth()) return;
    if (voiceSuggestedTasks.length === 0) return;

    setCreatingTasks(true);
    setError("");
    setVoiceTasksMessage("");

    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");

      const finalCategory = tasksSourceCategory ?? normalizeTaskCategory(newCategory || null) ?? null;

      const rows = voiceSuggestedTasks.map((tItem) => {
        let dueIso: string | null = tItem.dueIso || null;

        if (!dueIso && tItem.dueLabel) {
          const parsed = Date.parse(tItem.dueLabel);
          if (!Number.isNaN(parsed)) dueIso = new Date(parsed).toISOString();
          else {
            const resolved = resolveNaturalDue(tItem.dueLabel);
            if (resolved) dueIso = resolved;
          }
        }

        let reminderAt: string | null = null;
        let timeFrom: string | null = null;
        let timeTo: string | null = null;
        let dueDateForColumn: string | null = null;

        if (dueIso) {
          const due = new Date(dueIso);
          dueDateForColumn = dueIso;

          const local = new Date(due);
          const h = local.getHours();
          const m = local.getMinutes();

          timeFrom = `${pad(h)}:${pad(m)}`;
          const end = new Date(local.getTime() + 60 * 60 * 1000);
          timeTo = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

          reminderAt = dueIso;
        }

        return {
          user_id: user!.id,
          title: tItem.title,
          description: null,
          completed: false,
          created_at: now.toISOString(),
          completed_at: null,

          category: finalCategory,

          time_from: timeFrom,
          time_to: timeTo,
          due_date: dueDateForColumn,

          reminder_enabled: !!reminderAt,
          reminder_at: reminderAt,
          reminder_sent_at: null,
        } as any;
      });

      const { error: insertError } = await supabase.from("tasks").insert(rows);

      if (insertError) {
        console.error("[tasks] insert error:", insertError);
        setError(t("errors.createTasksFromVoiceFailed", "Failed to create tasks:") + " " + (insertError.message || insertError.details || ""));
        return;
      }

      setVoiceTasksMessage(t("tasks.voice.created", "Created tasks."));
      setVoiceSuggestedTasks([]);
      setTasksSourceCategory(null);

      router.push("/tasks");
    } catch (err) {
      console.error("[tasks] unexpected error", err);
      setError(t("errors.createTasksUnexpected", "Unexpected error while creating tasks (check console)."));
    } finally {
      setCreatingTasks(false);
    }
  }

  const filteredNotes = useMemo(() => {
    const res = categoryFilter === "all" ? [...notes] : notes.filter((n) => (n.category || "") === categoryFilter);

    return res.sort((a, b) => {
      if (sortBy === "created_desc") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === "created_asc") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortBy === "alpha_asc") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "alpha_desc") return (b.title || "").localeCompare(a.title || "");
      return 0;
    });
  }, [notes, categoryFilter, sortBy]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center w-full overflow-x-hidden">
        <p className="text-[var(--text-muted)]">{t("checkingSession", "Checking session…")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] p-4 md:p-8 pb-24 w-full overflow-x-hidden">
      <AppHeader active="notes" />

      <AuthGateModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Guest Banner - Full Width */}
      {!user && (
        <div className="max-w-5xl mx-auto mt-6 mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
          <div className="flex-1 relative z-10 min-w-0">
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
              NOTES & THOUGHTS
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">Capture ideas instantly ⚡️</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md leading-relaxed">
              Jot down thoughts, meetings, or journals. Use AI to clean them up, summarize, or extract action items automatically.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-indigo-500/20"
              >
                Log in to save notes
              </button>
            </div>
          </div>
          <div className="w-full max-w-xs relative z-10 hidden md:block">
            <Alive3DImage src="/images/notes-welcome.png?v=1" alt="Notes" className="w-full h-auto drop-shadow-2xl" />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full grid gap-6 grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* CREATE NOTE */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)] min-w-0 h-fit">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold break-words">{t("create.heading", "Create a new note")}</h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 break-words">
                {t("create.subheading", "Use AI to summarize, bullet, or rewrite your notes. Capture ideas with your voice, too.")}
              </p>

              {!user && (
                <p className="mt-2 text-[11px] text-[var(--text-muted)] break-words">
                  You’re browsing as a <span className="font-semibold">visitor</span>. Click any action to log in.
                </p>
              )}
            </div>

            {user ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="shrink-0 text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                {t("create.logout", "Log out")}
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="shrink-0 text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                Log in
              </button>
            )}
          </div>

          {error && <div className="text-sm text-red-400 mb-3 break-words">{error}</div>}

          <form
            onSubmit={(e) => {
              if (!user) {
                e.preventDefault();
                setAuthModalOpen(true);
                return;
              }
              handleSaveNote(e);
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder={"Note title"}
              className="w-full min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm focus:outline-none"
              value={title}
              readOnly={!user}
              onFocus={() => requireAuth()}
              onChange={(e) => {
                if (!requireAuth()) return;
                setTitle(e.target.value);
              }}
            />

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="break-words">{t("form.dateLabel", "Note date:")}</span>
                <input
                  type="date"
                  value={noteDate}
                  onFocus={() => requireAuth()}
                  onChange={(e) => {
                    if (!requireAuth()) return;
                    setNoteDate(e.target.value);
                  }}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="break-words">{t("form.categoryLabel", "Category:")}</span>
                <select
                  value={newCategory}
                  onFocus={() => requireAuth()}
                  onChange={(e) => {
                    if (!requireAuth()) return;
                    setNewCategory(e.target.value);
                    setTasksSourceCategory(normalizeTaskCategory(e.target.value || null));
                  }}
                  className="max-w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                >
                  <option value="">{t("form.category.none", "None")}</option>
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`category.${CATEGORY_KEY_MAP[c]}`, c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 min-w-0">
                <input
                  id="auto-title"
                  type="checkbox"
                  checked={autoTitleEnabled}
                  onChange={(e) => {
                    setAutoTitleEnabled(e.target.checked);
                  }}
                  className="h-3 w-3 shrink-0"
                />
                <label htmlFor="auto-title" className="cursor-pointer text-[11px] break-words">
                  {t("form.smartTitleLabel", "Smart title from content")}
                </label>
              </div>
            </div>

            <textarea
              placeholder={"Write your note here..."}
              className="w-full min-w-0 min-h-[120px] px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
              value={content}
              readOnly={!user}
              onFocus={() => requireAuth()}
              onChange={(e) => {
                if (!requireAuth()) return;
                setContent(e.target.value);
              }}
            />

            <div className="flex flex-col gap-2 text-[11px] text-[var(--text-muted)] min-w-0">
              <span className="break-words">
                {t("plan.label", "Plan")}: <span className="font-semibold">{plan}</span> • {t("plan.aiTodayLabel", "AI today")}:{" "}
                <span className="font-semibold">
                  {aiCountToday}/{dailyLimit}
                </span>
              </span>

              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-[10px] break-words">{t("voice.modeLabel", "Voice capture mode:")}</span>
                <button
                  type="button"
                  onClick={() => setVoiceMode("review")}
                  className={`px-2 py-1 rounded-full border text-[10px] ${voiceMode === "review" ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                    }`}
                >
                  {t("voice.mode.review", "Review first")}
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMode("autosave")}
                  className={`px-2 py-1 rounded-full border text-[10px] ${voiceMode === "autosave" ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                    }`}
                >
                  {t("voice.mode.autosave", "Auto-save note")}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <div className="mt-2 flex items-center gap-2 flex-wrap min-w-0">
                {user ? (
                  <VoiceCaptureButton
                    userId={user.id as string}
                    mode={voiceMode}
                    resetKey={voiceResetKey}
                    onResult={handleVoiceResult}
                    variant="icon"
                    size="md"
                    interaction="toggle"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    aria-label={t("voice.loginToUse", "Log in to use voice")}
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
                  >
                    🎤
                  </button>
                )}

                {(content || title || voiceSuggestedTasks.length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetVoice}
                    className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px] hover:bg-[var(--bg-card)]"
                  >
                    {t("voice.resetButton", "Reset voice")}
                  </button>
                )}
              </div>
            </div>

            {voiceSuggestedTasks.length > 0 && (
              <div className="mt-3 border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)]/60 text-[11px] min-w-0">
                <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                  <p className="font-semibold break-words">{t("tasks.suggested.title", "Suggested tasks")}</p>
                  {voiceTasksMessage && <span className="text-[10px] text-emerald-400 break-words">{voiceTasksMessage}</span>}
                </div>

                <ul className="list-disc pl-4 space-y-1 mb-2 min-w-0">
                  {voiceSuggestedTasks.map((tItem, idx) => (
                    <li key={idx} className="break-words">
                      <span className="font-medium break-words">{tItem.title}</span>
                      {tItem.dueLabel && <span className="text-[var(--text-muted)] break-words"> — {tItem.dueLabel}</span>}
                      {tItem.priority && <span className="ml-1 uppercase text-[9px] text-[var(--text-muted)]">[{tItem.priority}]</span>}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleCreateTasksFromVoice}
                  disabled={creatingTasks}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-[11px] disabled:opacity-60"
                >
                  {creatingTasks ? t("tasks.suggested.creating", "Creating tasks…") : t("tasks.suggested.createButton", "Create tasks")}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm disabled:opacity-50"
            >
              {loading ? t("buttons.saveNoteLoading", "Saving...") : t("buttons.saveNote", "Save note")}
            </button>
          </form>

          {plan === "free" && (
            <div className="mt-3 text-[11px] text-[var(--text-muted)] break-words">
              {t("buttons.upgradeHint", "AI limit reached often?")}{" "}
              <button disabled={billingLoading} onClick={() => setAuthModalOpen(true)} className="underline text-[var(--accent)]">
                {t("buttons.upgradeToPro", "Upgrade to Pro")}
              </button>
            </div>
          )}
        </section>

        {/* Notes List Column */}
        <section className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-card)] min-w-0 h-fit">
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2 min-w-0">
            <h2 className="text-lg font-semibold break-words">{t("list.title", "Your notes")}</h2>

            <div className="flex flex-wrap items-center gap-2 text-[11px] min-w-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="max-w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="created_desc">{t("sort.newest", "Newest")}</option>
                <option value="created_asc">{t("sort.oldest", "Oldest")}</option>
                <option value="alpha_asc">{t("sort.alphaAsc", "A-Z")}</option>
                <option value="alpha_desc">{t("sort.alphaDesc", "Z-A")}</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="max-w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="all">{t("list.filter.allCategories", "All categories")}</option>
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${CATEGORY_KEY_MAP[c]}`, c)}
                  </option>
                ))}
                <option value="">{t("list.filter.noCategory", "No category")}</option>
              </select>

              <button
                onClick={() => {
                  if (!user) {
                    setNotes(DEMO_NOTES);
                    return;
                  }
                  fetchNotes();
                }}
                className="text-sm px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                {t("list.refresh", "Refresh")}
              </button>
            </div>
          </div>

          {filteredNotes.length === 0 && !loadingList && <p className="text-[var(--text-muted)] text-sm break-words">{t("list.empty", "No notes found.")}</p>}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
            {filteredNotes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const badge = noteCategoryStyles[note.category || "Other"];
              const isOpen = openNoteIds.includes(note.id);

              return (
                <article key={note.id} className="border border-[var(--border-subtle)] rounded-xl p-3 bg-[var(--bg-elevated)] min-w-0">
                  {!isEditing && (
                    <div className="flex items-start gap-2 mb-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleNoteOpen(note.id)}
                        className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[10px] hover:bg-[var(--bg-elevated)]"
                        aria-label={isOpen ? t("list.aria.collapse", "Collapse note") : t("list.aria.expand", "Expand note")}
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>

                      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-1 break-words">
                            {note.title || t("list.untitled", "Untitled")}
                          </h3>
                          <span className="text-[10px] text-[var(--text-muted)] break-words">
                            {note.created_at ? formatDateTime(note.created_at) : ""}
                          </span>
                        </div>

                        {note.category && (
                          <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${badge}`}>
                            {getCategoryLabel(note.category)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!isEditing && isOpen && (
                    <>
                      {note.content && (
                        <p className="mt-2 text-xs text-[var(--text-main)] whitespace-pre-wrap break-words min-w-0">
                          {note.content}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleGenerateTasksFromNote(note)}
                          disabled={noteTasksLoadingId === note.id || creatingTasks}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)] disabled:opacity-60"
                        >
                          {noteTasksLoadingId === note.id || creatingTasks ? "Finding tasks..." : "⚡ Tasks from note"}
                        </button>

                        <button
                          onClick={() => {
                            if (!requireAuth()) return;
                            setError("");
                          }}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          🌍 Translate text
                        </button>

                        <button
                          onClick={() => handleAI(note.id, note.content, "summarize")}
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {aiLoading === note.id ? t("buttons.summarizeLoading", "Summarizing...") : t("buttons.summarize", "✨ Summarize")}
                        </button>

                        <button
                          onClick={() => handleAI(note.id, note.content, "bullets")}
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {t("buttons.bullets", "📋 Bullets")}
                        </button>

                        <button
                          onClick={() => handleAI(note.id, note.content, "rewrite")}
                          disabled={aiLoading === note.id}
                          className="text-xs px-3 py-1 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        >
                          {t("buttons.rewrite", "✍️ Rewrite")}
                        </button>

                        <button
                          onClick={() => handleShareNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {copiedNoteId === note.id ? t("buttons.shareCopied", "✅ Copied") : t("buttons.share", "Share")}
                        </button>

                        <button
                          onClick={() => handleAskAssistantAboutNote(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {t("buttons.askAI", "🤖 Ask AI")}
                        </button>

                        <button
                          onClick={() => startEdit(note)}
                          className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-[11px]"
                        >
                          {t("buttons.edit", "✏️ Edit")}
                        </button>

                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="px-2 py-1 rounded-lg border border-red-500 text-red-400 hover:bg-red-900/30 text-[11px]"
                        >
                          {deletingId === note.id ? t("buttons.deleteLoading", "Deleting...") : t("buttons.delete", "🗑 Delete")}
                        </button>
                      </div>

                      {note.ai_result && (
                        <div className="mt-3 text-xs text-[var(--text-main)] border-t border-[var(--border-subtle)] pt-2 whitespace-pre-wrap break-words min-w-0">
                          <strong>{t("list.aiResultTitle", "AI Result:")}</strong>
                          <br />
                          {note.ai_result}
                        </div>
                      )}
                    </>
                  )}

                  {isEditing && (
                    <div className="mt-2 space-y-3 min-w-0">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />

                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="max-w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="">{t("list.filter.noCategory", "No category")}</option>
                        {NOTE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {t(`category.${CATEGORY_KEY_MAP[c]}`, c)}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-w-0 min-h-[100px] px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveEdit(note.id)}
                          disabled={savingEditId === note.id}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-body)] text-xs disabled:opacity-60"
                        >
                          {savingEditId === note.id ? t("buttons.editSaveLoading", "Saving...") : t("buttons.editSave", "Save")}
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

          <div className="mt-4 text-[11px] flex flex-wrap gap-3 text-[var(--text-muted)]">
            <Link href="/tasks" className="hover:text-[var(--accent)]">
              {t("list.goToTasks", "→ Go to Tasks")}
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--accent)]">
              {t("list.openDashboard", "Open Dashboard")}
            </Link>
          </div>

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
