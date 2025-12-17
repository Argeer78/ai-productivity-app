"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useT } from "@/lib/useT";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";

type VoiceTaskSuggestion = {
  title: string;
  dueIso: string | null;
  dueLabel: string | null;
  priority?: "low" | "medium" | "high" | null;
};

type VoiceStructured = {
  tasks?: {
    title?: string;
    due_natural?: string | null;
    due_iso?: string | null;
    priority?: "low" | "medium" | "high" | null;
  }[];
};

type TaskRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  completed: boolean | null;
  due_date: string | null; // ISO string in DB
  created_at: string;
  completed_at: string | null;
  category: string | null;
  time_from: string | null;
  time_to: string | null;

  reminder_enabled: boolean | null;
  reminder_at: string | null; // ISO
};

type MiniDatePickerProps = {
  value: string; // "yyyy-mm-dd" or ""
  onChange: (val: string) => void;
  t: (key: string, fallback?: string) => string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Convert stored UTC ISO → datetime-local string (local wall time "YYYY-MM-DDTHH:MM")
 */
function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const tzOffsetMinutes = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffsetMinutes * 60_000);

  return local.toISOString().slice(0, 16);
}

/**
 * Convert datetime-local string (interpreted in local timezone) → UTC ISO
 */
function fromLocalInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Tiny inline calendar for picking dates.
 */
function MiniDatePicker({ value, onChange, t }: MiniDatePickerProps) {
  const [open, setOpen] = useState(false);

  const baseDate = value ? new Date(value + "T00:00:00") : new Date();
  const [year, setYear] = useState(baseDate.getFullYear());
  const [month, setMonth] = useState(baseDate.getMonth());

  function goPrevMonth() {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function goNextMonth() {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(year, month, 1));
    } catch {
      return new Date(year, month, 1).toLocaleString(undefined, { month: "short" });
    }
  }, [year, month]);

  const weekdayLabels = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
      const start = new Date(2023, 0, 1); // Sunday
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return fmt.format(d);
      });
    } catch {
      return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    }
  }, []);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);

  const weeks: (number | null)[][] = [];
  let currentDay = 1 - firstDay;

  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      if (currentDay < 1 || currentDay > daysInMonth) week.push(null);
      else week.push(currentDay);
      currentDay++;
    }
    weeks.push(week);
  }

  const selectedYmd = value || "";

  function handleSelectDay(day: number | null) {
    if (!day) return;
    const date = new Date(year, month, day);
    onChange(toYmd(date));
    setOpen(false);
  }

  return (
    <div className="relative inline-block text-[11px] text-[var(--text-main)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      >
        <span>{selectedYmd || t("form.pickDate", "Pick date")}</span>
        <span className="text-[10px] opacity-70">{t("form.calendarIconLabel", "📅")}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-52 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-2">
          <div className="flex items-center justify-between mb-1 text-[11px] text-[var(--text-main)]">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-1 hover:text-[var(--accent)]"
              aria-label={t("date.prevMonth", "Previous month")}
            >
              ‹
            </button>
            <span className="font-semibold">
              {monthLabel} {year}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-1 hover:text-[var(--accent)]"
              aria-label={t("date.nextMonth", "Next month")}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[10px] text-[var(--text-muted)] mb-1">
            {weekdayLabels.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[11px]">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) {
                  return (
                    <span
                      key={`${wi}-${di}`}
                      className="h-6 text-center text-[var(--text-muted)]/40"
                    />
                  );
                }

                const thisYmd = toYmd(new Date(year, month, day));
                const isSelected = thisYmd === selectedYmd;

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-6 rounded-md text-center ${
                      isSelected
                        ? "bg-[var(--accent)] text-[var(--bg-body)]"
                        : "text-[var(--text-main)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function resolveNaturalDue(label: string): string | null {
  if (!label) return null;
  const text = label.toLowerCase();
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

  if (text.includes("tomorrow")) target.setDate(target.getDate() + 1);
  else if (text.includes("next week")) target.setDate(target.getDate() + 7);

  if (text.includes("morning")) target.setHours(8, 0, 0, 0);
  else if (text.includes("noon")) target.setHours(12, 0, 0, 0);
  else if (text.includes("afternoon")) target.setHours(15, 0, 0, 0);
  else if (text.includes("evening") || text.includes("tonight")) target.setHours(20, 0, 0, 0);

  return target.toISOString();
}

// 24h time dropdown options (00:00 - 23:00)
const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`);

// Category list (values stay stable for DB)
const TASK_CATEGORIES = ["Work", "Personal", "Health", "Study", "Errands", "Home", "Travel", "Other"] as const;

const taskCategoryStyles: Record<string, string> = {
  Work: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Personal: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Health: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Study: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Errands: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Home: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Travel: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Other: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
};

export default function TasksPage() {
  const { t } = useT("tasks");

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // new task form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newTimeFrom, setNewTimeFrom] = useState<string>("");
  const [newTimeTo, setNewTimeTo] = useState<string>("");

  // reminder fields for new task
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderAtLocal, setNewReminderAtLocal] = useState<string>("");

  const [savingNew, setSavingNew] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // 🎤 Voice → task suggestions
  const [voiceSuggestedTasks, setVoiceSuggestedTasks] = useState<VoiceTaskSuggestion[]>([]);
  const [creatingVoiceTasks, setCreatingVoiceTasks] = useState(false);
  const [voiceTasksMessage, setVoiceTasksMessage] = useState("");
  const [voiceResetKey, setVoiceResetKey] = useState(0);

  // view mode
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">("active");

  // category filter
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // share UI state
  const [sharingTaskId, setSharingTaskId] = useState<string | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  // bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // which tasks are open (show details form)
  const [openTaskIds, setOpenTaskIds] = useState<string[]>([]);

  const todayYmd = new Date().toISOString().slice(0, 10);
  const categoryLabel = (cat: string) => t(`category.${cat}`, cat);

  // ✅ Voice result handler MUST be inside component (it uses state setters)
  function handleVoiceResult(payload: { rawText: string | null; structured: VoiceStructured | null }) {
    const structured = payload.structured;

    if (!structured || !Array.isArray(structured.tasks)) {
      setVoiceSuggestedTasks([]);
      setVoiceTasksMessage("");
      return;
    }

    const suggestions: VoiceTaskSuggestion[] = structured.tasks.map((tt) => {
      const title =
        typeof tt.title === "string" && tt.title.trim() ? tt.title.trim() : "(Untitled task)";

      let dueIso: string | null = null;
      let dueLabel: string | null = null;

      if (typeof tt.due_iso === "string" && tt.due_iso.trim()) {
        dueIso = tt.due_iso.trim();
        const parsed = Date.parse(dueIso);
        if (!Number.isNaN(parsed)) dueLabel = new Date(parsed).toLocaleString();
      }

      if (!dueIso && typeof tt.due_natural === "string" && tt.due_natural.trim()) {
        const natural = tt.due_natural.trim();
        const resolved = resolveNaturalDue(natural);
        if (resolved) {
          dueIso = resolved;
          const parsed = Date.parse(resolved);
          if (!Number.isNaN(parsed)) dueLabel = new Date(parsed).toLocaleString();
        }
        if (!dueLabel) dueLabel = natural;
      }

      return {
        title,
        dueIso,
        dueLabel,
        priority:
          tt.priority === "low" || tt.priority === "medium" || tt.priority === "high"
            ? tt.priority
            : null,
      };
    });

    const nonEmpty = suggestions.filter((s) => s.title.trim().length > 0);
    setVoiceSuggestedTasks(nonEmpty);
    setVoiceTasksMessage(nonEmpty.length ? "" : t("voice.noTasks", "No clear tasks found in voice input."));
  }

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[tasks] getUser exception", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  async function fetchTasks(userId: string) {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[tasks] loadTasks error", error);
        setError(t("loadError", "Failed to load tasks."));
        setTasks([]);
        return;
      }

      setTasks((data || []) as TaskRow[]);
    } catch (err) {
      console.error("[tasks] loadTasks exception", err);
      setError(t("loadError", "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }

  // Load tasks
  useEffect(() => {
    if (!user) return;
    fetchTasks(user.id);
  }, [user]);

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const title = newTitle.trim();
    const description = newDescription.trim();
    if (!title && !description) return;

    setSavingNew(true);
    setError("");

    try {
      const dueDateIso =
        newDueDate.trim() !== "" ? new Date(newDueDate + "T00:00:00").toISOString() : null;

      let reminderAtIso: string | null = null;
      if (newReminderEnabled && newReminderAtLocal) {
        reminderAtIso = fromLocalInputToIso(newReminderAtLocal);
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            user_id: user.id,
            title: title || null,
            description: description || null,
            completed: false,
            due_date: dueDateIso,
            completed_at: null,
            category: newCategory || null,
            time_from: newTimeFrom || null,
            time_to: newTimeTo || null,
            reminder_enabled: !!reminderAtIso,
            reminder_at: reminderAtIso,
          },
        ])
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at"
        )
        .single();

      if (error) {
        console.error("[tasks] insert error", error);
        setError(t("addError", "Failed to add task."));
        return;
      }

      if (data) setTasks((prev) => [data as TaskRow, ...prev]);

      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewCategory("");
      setNewTimeFrom("");
      setNewTimeTo("");
      setNewReminderEnabled(false);
      setNewReminderAtLocal("");
    } catch (err) {
      console.error("[tasks] insert exception", err);
      setError(t("addError", "Failed to add task."));
    } finally {
      setSavingNew(false);
    }
  }

  // Close share menu on outside click/scroll
  useEffect(() => {
    function handleOutside(event: Event) {
      if (!sharingTaskId) return;

      const target = event.target as Node | null;
      if (shareMenuRef.current && target && !shareMenuRef.current.contains(target)) {
        setSharingTaskId(null);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("scroll", handleOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("scroll", handleOutside, true);
    };
  }, [sharingTaskId]);

  async function handleCreateTasksFromVoice() {
    if (!user || voiceSuggestedTasks.length === 0) return;

    setCreatingVoiceTasks(true);
    setError("");
    setVoiceTasksMessage("");

    try {
      const nowIso = new Date().toISOString();

      const rows = voiceSuggestedTasks.map((tt) => ({
        user_id: user.id,
        title: tt.title,
        description: null,
        completed: false,
        created_at: nowIso,
        completed_at: null,
        category: null,
        time_from: null,
        time_to: null,
        due_date: tt.dueIso,
        reminder_enabled: !!tt.dueIso,
        reminder_at: tt.dueIso,
        reminder_sent_at: null,
      }));

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        console.error("[tasks] voice insert error", insertError);
        setError(t("voice.createError", "Failed to create tasks from voice."));
        return;
      }

      await fetchTasks(user.id);

      setVoiceSuggestedTasks([]);
      setVoiceResetKey((k) => k + 1);
      setVoiceTasksMessage(t("voice.created", "Tasks created from voice 🎉"));
    } catch (err) {
      console.error("[tasks] voice create exception", err);
      setError(t("voice.createError", "Failed to create tasks from voice."));
    } finally {
      setCreatingVoiceTasks(false);
    }
  }

  async function toggleDone(task: TaskRow) {
    if (!user) return;

    const newDone = !task.completed;
    setSavingTaskId(task.id);
    setError("");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          completed: newDone,
          completed_at: newDone ? new Date().toISOString() : null,
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at"
        )
        .single();

      if (error) {
        console.error("[tasks] toggleDone error", error);
        setError(t("updateError", "Could not update task."));
        return;
      }

      setTasks((prev) => prev.map((tRow) => (tRow.id === task.id ? ((data as TaskRow) || tRow) : tRow)));
    } catch (err) {
      console.error("[tasks] toggleDone exception", err);
      setError(t("updateError", "Could not update task."));
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleUpdateTask(task: TaskRow, updates: Partial<TaskRow>) {
    if (!user) return;

    setSavingTaskId(task.id);
    setError("");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: updates.title ?? task.title,
          description: updates.description ?? task.description,
          due_date: updates.due_date ?? task.due_date,
          category: updates.category !== undefined ? updates.category : task.category,
          time_from: updates.time_from !== undefined ? updates.time_from : task.time_from,
          time_to: updates.time_to !== undefined ? updates.time_to : task.time_to,
          reminder_enabled: updates.reminder_enabled !== undefined ? updates.reminder_enabled : task.reminder_enabled,
          reminder_at: updates.reminder_at !== undefined ? updates.reminder_at : task.reminder_at,
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at"
        )
        .single();

      if (error) {
        console.error("[tasks] update error", error);
        setError(t("saveError", "Could not save task."));
        return;
      }

      setTasks((prev) => prev.map((tRow) => (tRow.id === task.id ? ((data as TaskRow) || tRow) : tRow)));
    } catch (err) {
      console.error("[tasks] update exception", err);
      setError(t("saveError", "Could not save task."));
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleDeleteTask(task: TaskRow) {
    if (!user) return;
    if (!window.confirm(t("confirmDelete", "Delete this task?"))) return;

    setDeletingTaskId(task.id);
    setError("");

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", user.id);

      if (error) {
        console.error("[tasks] delete error", error);
        setError(t("deleteError", "Could not delete task."));
        return;
      }

      setTasks((prev) => prev.filter((tRow) => tRow.id !== task.id));
      setSelectedTaskIds((prev) => prev.filter((id) => id !== task.id));
      setOpenTaskIds((prev) => prev.filter((id) => id !== task.id));
    } catch (err) {
      console.error("[tasks] delete exception", err);
      setError(t("deleteError", "Could not delete task."));
    } finally {
      setDeletingTaskId(null);
    }
  }

  function toggleSelected(taskId: string) {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  }

  function getTaskShareText(task: TaskRow) {
    const lines: string[] = [];

    lines.push(`Task: ${task.title || "(untitled task)"}`);
    if (task.category) lines.push(`Category: ${task.category}`);

    if (task.due_date) {
      const date = new Date(task.due_date);
      lines.push(`When: ${date.toLocaleDateString()}`);
    }

    if (task.time_from || task.time_to) {
      lines.push(`Time: ${task.time_from || "--:--"}–${task.time_to || "--:--"}`);
    }

    if (task.description) {
      lines.push("");
      lines.push("Notes:");
      lines.push(task.description);
    }

    lines.push("");
    lines.push("— Shared from AI Productivity Hub");

    return lines.join("\n");
  }

  function handleShareCopy(task: TaskRow) {
    const text = getTaskShareText(task);
    navigator.clipboard?.writeText?.(text).then(() => {
      setCopiedTaskId(task.id);
      setTimeout(() => setCopiedTaskId(null), 2000);
    });
  }

  function handleShareWhatsApp(task: TaskRow) {
    const text = encodeURIComponent(getTaskShareText(task));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleShareViber(task: TaskRow) {
    const text = encodeURIComponent(getTaskShareText(task));
    window.open(`viber://forward?text=${text}`, "_blank");
  }

  function handleShareEmail(task: TaskRow) {
    const subject = encodeURIComponent(`Task: ${task.title || "Shared task"}`);
    const body = encodeURIComponent(getTaskShareText(task));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleBulkCopy(mode: "today" | "selected") {
    let list: TaskRow[];

    if (mode === "today") {
      list = tasks.filter((tRow) => {
        const created = tRow.created_at?.slice(0, 10) === todayYmd;
        const due = tRow.due_date && tRow.due_date.slice(0, 10) === todayYmd;
        return created || due;
      });
    } else {
      list = tasks.filter((tRow) => selectedTaskIds.includes(tRow.id));
    }

    if (list.length === 0) {
      alert(
        mode === "today"
          ? t("share.noToday", "No tasks for today to share.")
          : t("share.noSelected", "No tasks selected to share.")
      );
      return;
    }

    const header =
      mode === "today"
        ? `${t("share.todayHeader", "Today's tasks")} (${todayYmd})`
        : `${t("share.selectedHeader", "Selected tasks")} (${list.length})`;

    const text = [header, "", ...list.map((x, i) => `${i + 1}. ${x.title || "(untitled task)"}`)].join("\n");

    navigator.clipboard?.writeText?.(text).then(() => alert(t("share.copied", "Copied to clipboard.")));
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">{t("checkingSession", "Checking your session…")}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="tasks" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">{t("title", "Tasks")}</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            {t("loginPrompt", "Log in or create a free account to track your tasks.")}
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--bg-body)]"
          >
            {t("goToAuth", "Go to login / signup")}
          </Link>
        </div>
      </main>
    );
  }

  const filteredTasks = tasks.filter((task) => {
    const done = !!task.completed;
    const passesView = viewMode === "active" ? !done : viewMode === "completed" ? done : true;

    const passesCategory = categoryFilter === "all" ? true : (task.category || "") === categoryFilter;

    return passesView && passesCategory;
  });

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="tasks" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{t("title", "Tasks")}</h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-4">
            {t("subtitle", "Capture tasks, check them off, and keep track of your progress.")}
          </p>

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

          {/* New task form */}
          <form
            onSubmit={handleAddTask}
            className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--text-main)]">{t("addNew", "Add a new task")}</p>

              <Link
                href="/ai-task-creator"
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
              >
                {t("aiTaskCreator", "🤖 AI Task Creator")}
              </Link>
            </div>

            {/* 🎤 Voice capture */}
            <div className="flex items-center gap-2 flex-wrap">
              <VoiceCaptureButton userId={user.id} mode="review" resetKey={voiceResetKey} onResult={handleVoiceResult} />
              {voiceSuggestedTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceSuggestedTasks([]);
                    setVoiceTasksMessage("");
                    setVoiceResetKey((k) => k + 1);
                  }}
                  className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px] hover:bg-[var(--bg-card)]"
                >
                  {t("voice.clear", "Clear voice")}
                </button>
              )}
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("form.titlePlaceholder", "Task title…")}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2"
            />

            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder", "Optional description or notes…")}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2 min-h-[60px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">{t("form.dueDateLabel", "Due date")}</span>
                <MiniDatePicker value={newDueDate} onChange={setNewDueDate} t={t} />
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">{t("form.categoryLabel", "Category")}</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">{t("form.category.none", "None")}</option>
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-main)] flex-wrap">
                <span className="text-[11px] text-[var(--text-muted)]">{t("form.timeLabel", "Time (optional)")}</span>
                <select
                  value={newTimeFrom}
                  onChange={(e) => setNewTimeFrom(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">{t("form.time.from", "From")}</option>
                  {TIME_OPTIONS.map((tOpt) => (
                    <option key={tOpt} value={tOpt}>
                      {tOpt}
                    </option>
                  ))}
                </select>
                <span>–</span>
                <select
                  value={newTimeTo}
                  onChange={(e) => setNewTimeTo(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">{t("form.time.to", "To")}</option>
                  {TIME_OPTIONS.map((tOpt) => (
                    <option key={tOpt} value={tOpt}>
                      {tOpt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 text-xs text-[var(--text-main)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReminderEnabled}
                    onChange={(e) => setNewReminderEnabled(e.target.checked)}
                    className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  />
                  <span>{t("form.reminderLabel", "Set reminder for this task")}</span>
                </label>
                {newReminderEnabled && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={newReminderAtLocal}
                      onChange={(e) => setNewReminderAtLocal(e.target.value)}
                      className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingNew}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs text-[var(--bg-body)]"
              >
                {savingNew ? t("form.adding", "Adding…") : t("form.addButton", "Add task")}
              </button>
            </div>
          </form>

          {/* Voice suggested tasks panel */}
          {voiceSuggestedTasks.length > 0 && (
            <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-xs">
              <p className="font-semibold mb-2">{t("voice.panelTitle", "Voice-suggested tasks")}</p>

              <ul className="list-disc pl-4 space-y-1">
                {voiceSuggestedTasks.map((tt, i) => (
                  <li key={i}>
                    {tt.title}
                    {tt.dueLabel && <span className="text-[var(--text-muted)]"> — {tt.dueLabel}</span>}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleCreateTasksFromVoice}
                disabled={creatingVoiceTasks}
                className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs disabled:opacity-60"
              >
                {creatingVoiceTasks ? t("voice.creating", "Creating…") : t("voice.createBtn", "Create tasks")}
              </button>

              {voiceTasksMessage && <p className="mt-2 text-emerald-400">{voiceTasksMessage}</p>}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
            <div className="flex rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              {(["active", "completed", "all"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 ${
                    viewMode === mode
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  }`}
                >
                  {mode === "active" && t("filters.active", "Active")}
                  {mode === "completed" && t("filters.completed", "Completed")}
                  {mode === "all" && t("filters.all", "All")}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1"
            >
              <option value="all">{t("filters.allCategories", "All categories")}</option>
              {TASK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>

            {/* (optional) bulk copy hooks you already have */}
            <button
              type="button"
              onClick={() => handleBulkCopy("today")}
              className="ml-auto px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
            >
              {t("share.copyToday", "Copy today's")}
            </button>
            <button
              type="button"
              onClick={() => handleBulkCopy("selected")}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
            >
              {t("share.copySelected", "Copy selected")}
            </button>
          </div>

          {/* Tasks list */}
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">{t("loadingTasks", "Loading tasks…")}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("empty", "No tasks yet. Add your first one above.")}</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("noTasksInView", "No tasks in this view. Try switching filters above.")}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isSaving = savingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;
                const dueDateValue = task.due_date ? task.due_date.slice(0, 10) : "";
                const completedAt = task.completed_at ? new Date(task.completed_at) : null;

                const cat = task.category || "Other";
                const catClass = taskCategoryStyles[cat] || taskCategoryStyles["Other"];

                const isSelected = selectedTaskIds.includes(task.id);

                const isOpen = openTaskIds.includes(task.id);
                const toggleOpen = () => {
                  setOpenTaskIds((prev) =>
                    prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                  );
                };

                const reminderLocal = toLocalDateTimeInput(task.reminder_at);

                async function handleReminderChange(enabled: boolean, localVal: string) {
                  if (!user) return;

                  let reminderAt: string | null = null;
                  if (enabled && localVal) reminderAt = fromLocalInputToIso(localVal);

                  setSavingTaskId(task.id);
                  setError("");

                  try {
                    const { data, error } = await supabase
                      .from("tasks")
                      .update({
                        reminder_enabled: !!reminderAt,
                        reminder_at: reminderAt,
                      })
                      .eq("id", task.id)
                      .eq("user_id", user.id)
                      .select(
                        "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at"
                      )
                      .single();

                    if (error) {
                      console.error("[tasks] reminder update error", error);
                      setError(t("reminderUpdateError", "Could not update reminder."));
                      return;
                    }

                    setTasks((prev) =>
                      prev.map((tRow) => (tRow.id === task.id ? ((data as TaskRow) || tRow) : tRow))
                    );
                  } catch (err) {
                    console.error("[tasks] reminder update exception]", err);
                    setError(t("reminderUpdateError", "Could not update reminder."));
                  } finally {
                    setSavingTaskId(null);
                  }
                }

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleOpen}
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px]"
                        aria-label={isOpen ? t("item.collapse", "Collapse task details") : t("item.expand", "Expand task details")}
                      >
                        <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleDone(task)}
                        disabled={isSaving}
                        className={`px-2 py-1 rounded-full border text-[11px] ${
                          task.completed
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-300"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                        }`}
                      >
                        {task.completed ? t("item.done", "✅ Done") : t("item.markDone", "✔ Mark as done")}
                      </button>

                      <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(task.id)}
                          className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                        />
                        <span>{t("item.select", "Select")}</span>
                      </label>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <p
                          className={`truncate text-sm ${
                            task.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-main)]"
                          }`}
                        >
                          {task.title || t("item.untitled", "(untitled task)")}
                        </p>

                        {task.category && (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${catClass}`}>
                            {categoryLabel(task.category)}
                          </span>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 space-y-2 text-[11px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <input
                            type="text"
                            defaultValue={task.title || ""}
                            onBlur={(e) => handleUpdateTask(task, { title: e.target.value })}
                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                            placeholder={t("form.titlePlaceholder", "Task title…")}
                          />

                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={task.category || ""}
                              onChange={(e) => handleUpdateTask(task, { category: e.target.value || null })}
                              className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                            >
                              <option value="">{t("form.category.none", "None")}</option>
                              {TASK_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {categoryLabel(c)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block mb-1 text-[10px] text-[var(--text-muted)]">{t("item.detailsLabel", "Details")}</label>
                          <textarea
                            defaultValue={task.description || ""}
                            onBlur={(e) => handleUpdateTask(task, { description: e.target.value })}
                            className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-main)] min-h-[48px]"
                            placeholder={t("item.detailsPlaceholder", "Details or notes…")}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span>{t("item.dueLabel", "Due:")}</span>
                              <MiniDatePicker
                                value={dueDateValue}
                                onChange={(ymd) => {
                                  const iso = new Date(ymd + "T00:00:00").toISOString();
                                  handleUpdateTask(task, { due_date: iso });
                                }}
                                t={t}
                              />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t("form.timeLabel", "Time (optional)")}</span>
                              <select
                                defaultValue={task.time_from || ""}
                                onChange={(e) => handleUpdateTask(task, { time_from: e.target.value || null })}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              >
                                <option value="">{t("form.time.from", "From")}</option>
                                {TIME_OPTIONS.map((tOpt) => (
                                  <option key={tOpt} value={tOpt}>
                                    {tOpt}
                                  </option>
                                ))}
                              </select>
                              <span>–</span>
                              <select
                                defaultValue={task.time_to || ""}
                                onChange={(e) => handleUpdateTask(task, { time_to: e.target.value || null })}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              >
                                <option value="">{t("form.time.to", "To")}</option>
                                {TIME_OPTIONS.map((tOpt) => (
                                  <option key={tOpt} value={tOpt}>
                                    {tOpt}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t("item.reminderLabel", "Reminder:")}</span>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  defaultChecked={!!task.reminder_enabled}
                                  onChange={(e) => handleReminderChange(e.target.checked, reminderLocal)}
                                  className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                                />
                                <span className="text-[10px]">{t("item.reminderEnable", "Enable")}</span>
                              </label>
                              <input
                                type="datetime-local"
                                defaultValue={reminderLocal}
                                onBlur={(e) => handleReminderChange(true, e.target.value)}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-[10px]">
                            <span>
                              {t("item.createdLabel", "Created:")} {new Date(task.created_at).toLocaleString()}
                            </span>

                            {completedAt && (
                              <span className="text-[var(--accent)]">
                                {t("item.completedLabel", "Completed:")} {completedAt.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                          <div className="relative" ref={shareMenuRef}>
                            <button
                              type="button"
                              onClick={() => setSharingTaskId((prev) => (prev === task.id ? null : task.id))}
                              className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                            >
                              {copiedTaskId === task.id ? t("item.copied", "✅ Copied") : t("item.share", "Share")}
                            </button>

                            {sharingTaskId === task.id && (
                              <div className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-40 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-2 text-[11px] z-50">
                                <button
                                  type="button"
                                  onClick={() => handleShareCopy(task)}
                                  className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                >
                                  {t("item.shareCopy", "📋 Copy text")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsApp(task)}
                                  className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                >
                                  {t("item.shareWhatsApp", "💬 WhatsApp")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareViber(task)}
                                  className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                >
                                  {t("item.shareViber", "📲 Viber")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareEmail(task)}
                                  className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                >
                                  {t("item.shareEmail", "✉️ Email")}
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task)}
                            disabled={isDeleting}
                            className="text-[11px] text-red-400 hover:text-red-300"
                          >
                            {isDeleting ? t("item.deleting", "Deleting…") : t("item.delete", "Delete")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Centered feedback form for Tasks page */}
          {tasks.length > 0 && (
            <section className="mt-10 mb-8">
              <div className="max-w-md mx-auto">
                <h2 className="text-sm font-semibold text-[var(--text-main)] mb-1 text-center">
                  {t("feedbackTitle", "Send feedback about Tasks")}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mb-3 text-center">
                  {t("feedbackSubtitle", "Spot a bug, missing feature, or something confusing? Let me know.")}
                </p>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <FeedbackForm user={user} />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
