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

type RepeatType = "none" | "daily" | "weekly" | "monthly";

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

  // legacy one-time reminder
  reminder_enabled: boolean | null;
  reminder_at: string | null; // ISO

  // repeat reminder fields
  reminder_repeat: RepeatType | null; // none/daily/weekly/monthly
  reminder_time: string | null; // "HH:MM:SS" (local wall time)
  reminder_weekdays: number[] | null; // for weekly: 0..6
  reminder_month_day: number | null; // for monthly: 1..31
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
 * Repeat reminder time helpers
 * - DB stores "HH:MM:SS"
 * - UI uses "HH:MM"
 */
function toLocalTimeInput(dbTime: string | null): string {
  if (!dbTime) return "";
  return dbTime.slice(0, 5);
}
function fromLocalTimeInputToDb(localHHMM: string): string | null {
  if (!localHHMM) return null;
  return `${localHHMM}:00`;
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
                  return <span key={`${wi}-${di}`} className="h-6 text-center text-[var(--text-muted)]/40" />;
                }

                const thisYmd = toYmd(new Date(year, month, day));
                const isSelected = thisYmd === selectedYmd;

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-6 rounded-md text-center ${isSelected
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

function normalizeDueIso(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2})(?::(\d{2}))(?::(\d{2}))?)?$/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 12;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;

  const local = new Date(year, month, day, hour, minute, second);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

function resolveNaturalDue(label: string): string | null {
  if (!label) return null;

  const text = label.toLowerCase();
  const now = new Date();

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

  if (text.includes("tomorrow") || text.includes("αύριο") || text.includes("αυριο")) {
    target.setDate(target.getDate() + 1);
  } else if (text.includes("next week") || text.includes("επόμενη εβδομάδα") || text.includes("επομενη εβδομαδα")) {
    target.setDate(target.getDate() + 7);
  } else if (text.includes("today") || text.includes("σήμερα") || text.includes("σημερα")) {
    // keep today
  }

  if (text.includes("morning") || text.includes("πρωί") || text.includes("πρωι")) {
    target.setHours(8, 0, 0, 0);
  } else if (text.includes("noon") || text.includes("μεσημέρι") || text.includes("μεσημερι")) {
    target.setHours(12, 0, 0, 0);
  } else if (text.includes("afternoon") || text.includes("απόγευμα") || text.includes("απογευμα")) {
    target.setHours(15, 0, 0, 0);
  } else if (
    text.includes("evening") ||
    text.includes("tonight") ||
    text.includes("βράδυ") ||
    text.includes("βραδυ") ||
    text.includes("απόψε") ||
    text.includes("αποψε")
  ) {
    target.setHours(20, 0, 0, 0);
  }

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|πμ|μμ)?\b|\b(\d{1,2}):(\d{2})\b/);

  if (timeMatch) {
    let hour: number | null = null;
    let minute: number | null = null;

    if (timeMatch[1]) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];

      if ((ampm === "pm" || ampm === "μμ") && hour < 12) hour += 12;
      if ((ampm === "am" || ampm === "πμ") && hour === 12) hour = 0;
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

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`);
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

const DEMO_TASKS: TaskRow[] = [
  {
    id: "demo-task-1",
    user_id: "visitor",
    title: "Welcome to Tasks (demo)",
    description: "You can browse tasks as a visitor. Click “Add task”, “Mark as done”, or edit anything → login popup.",
    completed: false,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    completed_at: null,
    category: "Work",
    time_from: "09:00",
    time_to: "10:00",
    reminder_enabled: false,
    reminder_at: null,
    reminder_repeat: "none",
    reminder_time: null,
    reminder_weekdays: null,
    reminder_month_day: null,
  },
  {
    id: "demo-task-2",
    user_id: "visitor",
    title: "Plan the week",
    description: "Draft 3 priorities + block time.",
    completed: true,
    due_date: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    category: "Personal",
    time_from: null,
    time_to: null,
    reminder_enabled: false,
    reminder_at: null,
    reminder_repeat: "none",
    reminder_time: null,
    reminder_weekdays: null,
    reminder_month_day: null,
  },
];

function AuthGateModal({
  open,
  onClose,
  title = "Log in to continue",
  subtitle = "Create an account to add, edit, or complete tasks.",
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
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
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

const WEEKDAYS = [
  { v: 0, key: "weekday.sun", fallback: "Sun" },
  { v: 1, key: "weekday.mon", fallback: "Mon" },
  { v: 2, key: "weekday.tue", fallback: "Tue" },
  { v: 3, key: "weekday.wed", fallback: "Wed" },
  { v: 4, key: "weekday.thu", fallback: "Thu" },
  { v: 5, key: "weekday.fri", fallback: "Fri" },
  { v: 6, key: "weekday.sat", fallback: "Sat" },
];

export default function TasksPage() {
  const { t } = useT("tasks");

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // Auth gate
  const [authModalOpen, setAuthModalOpen] = useState(false);
  function requireAuth(action?: () => void) {
    if (!user) {
      setAuthModalOpen(true);
      return false;
    }
    action?.();
    return true;
  }

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

  // legacy one-time reminder for new task
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderAtLocal, setNewReminderAtLocal] = useState<string>("");

  // repeat reminder fields for new task
  const [newReminderRepeat, setNewReminderRepeat] = useState<RepeatType>("none");
  const [newReminderTimeLocal, setNewReminderTimeLocal] = useState<string>("09:00");
  const [newReminderWeekdays, setNewReminderWeekdays] = useState<number[]>([]);
  const [newReminderMonthDay, setNewReminderMonthDay] = useState<number>(1);

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

  // bulk selection + bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // which tasks are open (show details form)
  const [openTaskIds, setOpenTaskIds] = useState<string[]>([]);

  const todayYmd = new Date().toISOString().slice(0, 10);
  const categoryLabel = (cat: string) => t(`category.${cat}`, cat);

  // ✅ IMPORTANT: keep selection clean when filters/data changes
  useEffect(() => {
    const idSet = new Set(tasks.map((x) => x.id));
    setSelectedTaskIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [tasks]);

  function toggleSelected(taskId: string) {
    if (!requireAuth()) return;
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  }

  function handleVoiceResult(payload: { rawText: string | null; structured: VoiceStructured | null }) {
    if (!requireAuth()) return;

    const structured = payload.structured;

    if (!structured || !Array.isArray(structured.tasks)) {
      setVoiceSuggestedTasks([]);
      setVoiceTasksMessage("");
      return;
    }

    const now = new Date();

    const suggestions: VoiceTaskSuggestion[] = structured.tasks.map((tt) => {
      const title = typeof tt.title === "string" && tt.title.trim() ? tt.title.trim() : "(Untitled task)";

      let dueIso: string | null = null;
      let dueLabel: string | null = null;

      const natural = typeof tt.due_natural === "string" && tt.due_natural.trim() ? tt.due_natural.trim() : null;
      const naturalLower = (natural || "").toLowerCase();

      const hasRelativeIntent =
        naturalLower.includes("tomorrow") ||
        naturalLower.includes("today") ||
        naturalLower.includes("tonight") ||
        naturalLower.includes("next") ||
        naturalLower.includes("in ");

      if (natural && hasRelativeIntent) {
        const resolved = resolveNaturalDue(natural);
        if (resolved) {
          dueIso = resolved;
          dueLabel = new Date(resolved).toLocaleString();
        } else {
          dueLabel = natural;
        }
      }

      if (!dueIso && typeof tt.due_iso === "string" && tt.due_iso.trim()) {
        const normalized = normalizeDueIso(tt.due_iso);
        if (normalized) {
          const parsed = new Date(normalized);
          if (parsed.getTime() > now.getTime() - 60_000) {
            dueIso = normalized;
            dueLabel = parsed.toLocaleString();
          }
        }
      }

      if (!dueIso && natural) {
        const resolved = resolveNaturalDue(natural);
        if (resolved) {
          dueIso = resolved;
          dueLabel = new Date(resolved).toLocaleString();
        } else {
          dueLabel = natural;
        }
      }

      return {
        title,
        dueIso,
        dueLabel,
        priority: tt.priority === "low" || tt.priority === "medium" || tt.priority === "high" ? tt.priority : null,
      };
    });

    const nonEmpty = suggestions.filter((s) => s.title.trim().length > 0);

    setVoiceSuggestedTasks(nonEmpty);
    setVoiceTasksMessage(nonEmpty.length === 0 ? t("voice.noTasks", "No clear tasks found in voice input.") : "");
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
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
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

  // Load tasks (or demo tasks for visitors)
  useEffect(() => {
    if (!user) {
      setTasks(DEMO_TASKS);
      setOpenTaskIds(DEMO_TASKS.length ? [DEMO_TASKS[0].id] : []);
      return;
    }
    fetchTasks(user.id);
  }, [user]);

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;

    const title = newTitle.trim();
    const description = newDescription.trim();
    if (!title && !description) return;

    setSavingNew(true);
    setError("");

    try {
      const dueDateIso = newDueDate.trim() !== "" ? new Date(newDueDate + "T00:00:00").toISOString() : null;

      // legacy one-time reminder
      let reminderAtIso: string | null = null;
      if (newReminderEnabled && newReminderAtLocal) {
        reminderAtIso = fromLocalInputToIso(newReminderAtLocal);
      }

      // repeat reminder fields
      const repeat = newReminderRepeat;
      const repeatEnabled = repeat !== "none";
      const reminder_time = repeatEnabled ? fromLocalTimeInputToDb(newReminderTimeLocal) : null;
      const reminder_weekdays =
        repeat === "weekly" ? (newReminderWeekdays.length ? newReminderWeekdays : [new Date().getDay()]) : null;
      const reminder_month_day = repeat === "monthly" ? newReminderMonthDay : null;

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

            // legacy
            reminder_enabled: !!reminderAtIso,
            reminder_at: reminderAtIso,

            // repeat
            reminder_repeat: repeat,
            reminder_time,
            reminder_weekdays,
            reminder_month_day,
          },
        ])
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
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

      // reset legacy reminder
      setNewReminderEnabled(false);
      setNewReminderAtLocal("");

      // reset repeat reminder
      setNewReminderRepeat("none");
      setNewReminderTimeLocal("09:00");
      setNewReminderWeekdays([]);
      setNewReminderMonthDay(1);
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
    if (!requireAuth()) return;
    if (voiceSuggestedTasks.length === 0) return;

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

        reminder_repeat: "none" as RepeatType,
        reminder_time: null,
        reminder_weekdays: null,
        reminder_month_day: null,
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
    if (!requireAuth()) return;

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
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
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
    if (!requireAuth()) return;

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

          reminder_repeat: updates.reminder_repeat !== undefined ? updates.reminder_repeat : task.reminder_repeat,
          reminder_time: updates.reminder_time !== undefined ? updates.reminder_time : task.reminder_time,
          reminder_weekdays: updates.reminder_weekdays !== undefined ? updates.reminder_weekdays : task.reminder_weekdays,
          reminder_month_day: updates.reminder_month_day !== undefined ? updates.reminder_month_day : task.reminder_month_day,
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
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

  async function handleBulkDelete(mode: "selected" | "today") {
    if (!requireAuth()) return;

    let idsToDelete: string[] = [];

    if (mode === "selected") {
      idsToDelete = [...selectedTaskIds];
    } else {
      const todayList = tasks.filter((tRow) => {
        const created = tRow.created_at?.slice(0, 10) === todayYmd;
        const due = tRow.due_date && tRow.due_date.slice(0, 10) === todayYmd;
        return created || due;
      });
      idsToDelete = todayList.map((x) => x.id);
    }

    idsToDelete = idsToDelete.filter((id) => !id.startsWith("demo-"));

    if (idsToDelete.length === 0) {
      alert(
        mode === "selected"
          ? t("bulkDelete.noneSelected", "No tasks selected to delete.")
          : t("bulkDelete.noneToday", "No tasks for today to delete.")
      );
      return;
    }

    const confirmText =
      mode === "selected"
        ? t("bulkDelete.confirmSelected", "Delete selected tasks? ({N})").replace("{N}", String(idsToDelete.length))
        : t("bulkDelete.confirmToday", "Delete today’s tasks? ({N})").replace("{N}", String(idsToDelete.length));

    if (!window.confirm(confirmText)) return;

    setBulkDeleting(true);
    setError("");

    try {
      const { error } = await supabase.from("tasks").delete().eq("user_id", user.id).in("id", idsToDelete);

      if (error) {
        console.error("[tasks] bulk delete error", error);
        setError(t("deleteError", "Could not delete task."));
        return;
      }

      setTasks((prev) => prev.filter((tRow) => !idsToDelete.includes(tRow.id)));
      setSelectedTaskIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      setOpenTaskIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    } catch (err) {
      console.error("[tasks] bulk delete exception", err);
      setError(t("deleteError", "Could not delete task."));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDeleteTask(task: TaskRow) {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    const text = getTaskShareText(task);
    navigator.clipboard?.writeText?.(text).then(() => {
      setCopiedTaskId(task.id);
      setTimeout(() => setCopiedTaskId(null), 2000);
    });
  }

  function handleShareWhatsApp(task: TaskRow) {
    if (!requireAuth()) return;
    const text = encodeURIComponent(getTaskShareText(task));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleShareViber(task: TaskRow) {
    if (!requireAuth()) return;
    const text = encodeURIComponent(getTaskShareText(task));
    window.open(`viber://forward?text=${text}`, "_blank");
  }

  function handleShareEmail(task: TaskRow) {
    if (!requireAuth()) return;
    const subject = encodeURIComponent(`Task: ${task.title || "Shared task"}`);
    const body = encodeURIComponent(getTaskShareText(task));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleBulkCopy(mode: "today" | "selected") {
    if (!requireAuth()) return;

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

  // ✅ Filtered tasks is memoized (less re-renders, safer for bulk helpers)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const done = !!task.completed;
      const passesView = viewMode === "active" ? !done : viewMode === "completed" ? done : true;
      const passesCategory = categoryFilter === "all" ? true : (task.category || "") === categoryFilter;
      return passesView && passesCategory;
    });
  }, [tasks, viewMode, categoryFilter]);

  // ✅ Bulk helpers (no hooks here => no “Rendered more hooks…”)
  const viewIdSet = useMemo(() => new Set(filteredTasks.map((tRow) => tRow.id)), [filteredTasks]);
  const selectedInViewCount = useMemo(() => selectedTaskIds.filter((id) => viewIdSet.has(id)).length, [selectedTaskIds, viewIdSet]);
  const allInViewSelected = filteredTasks.length > 0 && selectedInViewCount === filteredTasks.length;

  function selectAllInView() {
    if (!requireAuth()) return;
    const ids = filteredTasks.map((tRow) => tRow.id).filter((id) => !id.startsWith("demo-"));
    setSelectedTaskIds(ids);
  }

  function clearSelection() {
    if (!requireAuth()) return;
    setSelectedTaskIds([]);
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">{t("checkingSession", "Checking your session…")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="tasks" />
      <AuthGateModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("title", "Tasks")}</h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
                {t("subtitle", "Capture tasks, check them off, and keep track of your progress.")}
              </p>
              {!user && (
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  You’re browsing as a <span className="font-semibold">visitor</span>. Click any action to log in.
                </p>
              )}
            </div>

            {!user && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
              >
                Log in
              </button>
            )}
          </div>

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

          {/* New task form */}
          <form
            onSubmit={(e) => {
              if (!user) {
                e.preventDefault();
                setAuthModalOpen(true);
                return;
              }
              handleAddTask(e);
            }}
            className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--text-main)]">{t("addNew", "Add a new task")}</p>

              <Link
                href="/ai-task-creator"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    setAuthModalOpen(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
              >
                {t("aiTaskCreator", "🤖 AI Task Creator")}
              </Link>
            </div>

            {/* Voice capture */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {user ? (
                  <VoiceCaptureButton
                    userId={user.id}
                    mode="review"
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
                    className="h-10 w-10 rounded-full flex items-center justify-center bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
                  >
                    🎤
                  </button>
                )}

                {voiceSuggestedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) return setAuthModalOpen(true);
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
            </div>

            <input
              type="text"
              value={newTitle}
              readOnly={!user}
              onFocus={() => requireAuth()}
              onChange={(e) => {
                if (!requireAuth()) return;
                setNewTitle(e.target.value);
              }}
              placeholder={t("form.titlePlaceholder", "Task title…")}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2"
            />

            <textarea
              value={newDescription}
              readOnly={!user}
              onFocus={() => requireAuth()}
              onChange={(e) => {
                if (!requireAuth()) return;
                setNewDescription(e.target.value);
              }}
              placeholder={t("form.descriptionPlaceholder", "Optional description or notes…")}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2 min-h-[60px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">{t("form.dueDateLabel", "Due date")}</span>
                <div onMouseDown={(e) => (!user ? (e.preventDefault(), setAuthModalOpen(true)) : null)}>
                  <MiniDatePicker
                    value={newDueDate}
                    onChange={(val) => {
                      if (!requireAuth()) return;
                      setNewDueDate(val);
                    }}
                    t={t}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">{t("form.categoryLabel", "Category")}</span>
                <select
                  value={newCategory}
                  onFocus={() => requireAuth()}
                  onChange={(e) => {
                    if (!requireAuth()) return;
                    setNewCategory(e.target.value);
                  }}
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
                  onFocus={() => requireAuth()}
                  onChange={(e) => {
                    if (!requireAuth()) return;
                    setNewTimeFrom(e.target.value);
                  }}
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
                  onFocus={() => requireAuth()}
                  onChange={(e) => {
                    if (!requireAuth()) return;
                    setNewTimeTo(e.target.value);
                  }}
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

              {/* One-time reminder */}
              <div className="flex flex-col gap-1 text-xs text-[var(--text-main)]">
                <label
                  className="flex items-center gap-2"
                  onMouseDown={(e) => (!user ? (e.preventDefault(), setAuthModalOpen(true)) : null)}
                >
                  <input
                    type="checkbox"
                    checked={newReminderEnabled}
                    onChange={(e) => {
                      if (!requireAuth()) return;
                      setNewReminderEnabled(e.target.checked);
                    }}
                    className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  />
                  <span>{t("form.reminderLabel", "Set reminder for this task")}</span>
                </label>

                {newReminderEnabled && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={newReminderAtLocal}
                      onFocus={() => requireAuth()}
                      onChange={(e) => {
                        if (!requireAuth()) return;
                        setNewReminderAtLocal(e.target.value);
                      }}
                      className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                    />
                  </div>
                )}
              </div>

              {/* Repeat reminder */}
              <div className="flex flex-col gap-1 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">{t("repeat.label", "Repeat reminder")}</span>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={newReminderRepeat}
                    onFocus={() => requireAuth()}
                    onChange={(e) => {
                      if (!requireAuth()) return;
                      const v = e.target.value as RepeatType;
                      setNewReminderRepeat(v);
                      if (v === "none") setNewReminderWeekdays([]);
                      if (v === "weekly" && newReminderWeekdays.length === 0) setNewReminderWeekdays([new Date().getDay()]);
                      if (v === "monthly" && (!newReminderMonthDay || newReminderMonthDay < 1)) setNewReminderMonthDay(1);
                    }}
                    className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                  >
                    <option value="none">{t("repeat.none", "No repeat")}</option>
                    <option value="daily">{t("repeat.daily", "Daily")}</option>
                    <option value="weekly">{t("repeat.weekly", "Weekly")}</option>
                    <option value="monthly">{t("repeat.monthly", "Monthly")}</option>
                  </select>

                  <input
                    type="time"
                    value={newReminderTimeLocal}
                    onFocus={() => requireAuth()}
                    onChange={(e) => {
                      if (!requireAuth()) return;
                      setNewReminderTimeLocal(e.target.value);
                    }}
                    className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                    aria-label={t("repeat.timeLabel", "Reminder time")}
                  />
                </div>

                {newReminderRepeat === "weekly" && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {WEEKDAYS.map((d) => {
                      const active = newReminderWeekdays.includes(d.v);
                      return (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => {
                            if (!requireAuth()) return;
                            setNewReminderWeekdays((prev) => {
                              const next = prev.includes(d.v) ? prev.filter((x) => x !== d.v) : [...prev, d.v];
                              return next.length ? next : prev; // don’t allow empty
                            });
                          }}
                          className={`px-2 py-1 rounded-lg border text-[10px] ${active
                              ? "bg-[var(--accent)] text-[var(--bg-body)] border-[var(--accent)]"
                              : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                            }`}
                        >
                          {t(d.key, d.fallback)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {newReminderRepeat === "monthly" && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">{t("repeat.monthly.onDay", "On day")}</span>
                    <select
                      value={newReminderMonthDay}
                      onFocus={() => requireAuth()}
                      onChange={(e) => {
                        if (!requireAuth()) return;
                        setNewReminderMonthDay(Number(e.target.value));
                      }}
                      className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-[10px] text-[var(--text-muted)]">
                  {t("repeat.note", "Tip: use repeat for habits. One-time reminders are best for deadlines.")}
                </p>
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
              ```
              {voiceTasksMessage && <p className="mt-2 text-emerald-400">{voiceTasksMessage}</p>}
            </div>
          )}

          {/* Guest Banner */}
          {!user && (
            <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
              <div className="flex-1 relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
                  TASKS & TODOS
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
                  Get things done ✅
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md leading-relaxed">
                  Organize your life with clear tasks, due dates, and reminders. Let AI break down big goals into manageable steps.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-green-500/20"
                  >
                    Log in to track tasks
                  </button>
                </div>
              </div>
              <div className="w-full max-w-xs relative z-10">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] bg-white">
                  <img src="/images/tasks-welcome.png?v=1" alt="Tasks" className="w-full h-auto" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>
          )}

          {/* Filters + bulk actions */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
            <div className="flex rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              {(["active", "completed", "all"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 ${viewMode === mode
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

            <button
              type="button"
              onClick={selectAllInView}
              disabled={!user || filteredTasks.length === 0 || allInViewSelected}
              className="ml-auto px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] disabled:opacity-50 text-[11px]"
              title={t("bulkSelect.selectAllTitle", "Select all tasks currently in view")}
            >
              {t("bulkSelect.selectAll", "Select all")}
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={!user || selectedTaskIds.length === 0}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] disabled:opacity-50 text-[11px]"
              title={t("bulkSelect.clearTitle", "Clear selection")}
            >
              {t("bulkSelect.clear", "Clear")}
            </button>

            <button
              type="button"
              onClick={() => handleBulkCopy("today")}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
            >
              {t("share.copyToday", "Copy today's")}
            </button>

            <button
              type="button"
              onClick={() => handleBulkCopy("selected")}
              disabled={!user || selectedTaskIds.length === 0}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] disabled:opacity-50 text-[11px]"
            >
              {t("share.copySelected", "Copy selected")}
            </button>

            <button
              type="button"
              onClick={() => handleBulkDelete("selected")}
              disabled={!user || bulkDeleting || selectedTaskIds.length === 0}
              className="px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/15 disabled:opacity-50 text-[11px] text-red-300"
            >
              {bulkDeleting ? t("bulkDelete.deleting", "Deleting…") : t("bulkDelete.deleteSelected", "Delete selected")}
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
                  if (!requireAuth()) return;

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
                        "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
                      )
                      .single();

                    if (error) {
                      console.error("[tasks] reminder update error", error);
                      setError(t("reminderUpdateError", "Could not update reminder."));
                      return;
                    }

                    setTasks((prev) => prev.map((tRow) => (tRow.id === task.id ? ((data as TaskRow) || tRow) : tRow)));
                  } catch (err) {
                    console.error("[tasks] reminder update exception", err);
                    setError(t("reminderUpdateError", "Could not update reminder."));
                  } finally {
                    setSavingTaskId(null);
                  }
                }

                async function handleRepeatPatch(patch: Partial<TaskRow>) {
                  if (!requireAuth()) return;

                  setSavingTaskId(task.id);
                  setError("");

                  try {
                    const merged = {
                      reminder_repeat: patch.reminder_repeat ?? task.reminder_repeat ?? "none",
                      reminder_time: patch.reminder_time ?? task.reminder_time ?? null,
                      reminder_weekdays: patch.reminder_weekdays ?? task.reminder_weekdays ?? null,
                      reminder_month_day: patch.reminder_month_day ?? task.reminder_month_day ?? null,
                    };

                    const { data, error } = await supabase
                      .from("tasks")
                      .update(merged)
                      .eq("id", task.id)
                      .eq("user_id", user.id)
                      .select(
                        "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to, reminder_enabled, reminder_at, reminder_repeat, reminder_time, reminder_weekdays, reminder_month_day"
                      )
                      .single();

                    if (error) {
                      console.error("[tasks] repeat reminder update error", error);
                      setError(t("reminderUpdateError", "Could not update reminder."));
                      return;
                    }

                    setTasks((prev) => prev.map((tRow) => (tRow.id === task.id ? ((data as TaskRow) || tRow) : tRow)));
                  } catch (err) {
                    console.error("[tasks] repeat reminder update exception", err);
                    setError(t("reminderUpdateError", "Could not update reminder."));
                  } finally {
                    setSavingTaskId(null);
                  }
                }

                const repeat: RepeatType = (task.reminder_repeat || "none") as RepeatType;
                const repeatTimeLocal = toLocalTimeInput(task.reminder_time);
                const selectedWeekdays = Array.isArray(task.reminder_weekdays) ? task.reminder_weekdays : [];
                const monthDay = task.reminder_month_day ?? 1;

                return (
                  <div key={task.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm">
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
                        className={`px-2 py-1 rounded-full border text-[11px] ${task.completed
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-300"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                          }`}
                      >
                        {task.completed ? t("item.done", "✅ Done") : t("item.markDone", "✔ Mark as done")}
                      </button>

                      <label
                        className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"
                        onMouseDown={(e) => (!user ? (e.preventDefault(), setAuthModalOpen(true)) : null)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(task.id)}
                          className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                        />
                        <span>{t("item.select", "Select")}</span>
                      </label>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <p className={`truncate text-sm ${task.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-main)]"}`}>
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
                            readOnly={!user}
                            onFocus={() => requireAuth()}
                            onBlur={(e) => handleUpdateTask(task, { title: e.target.value })}
                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                            placeholder={t("form.titlePlaceholder", "Task title…")}
                          />

                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={task.category || ""}
                              onFocus={() => requireAuth()}
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
                            readOnly={!user}
                            onFocus={() => requireAuth()}
                            onBlur={(e) => handleUpdateTask(task, { description: e.target.value })}
                            className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-main)] min-h-[48px]"
                            placeholder={t("item.detailsPlaceholder", "Details or notes…")}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div
                              className="flex items-center gap-2"
                              onMouseDown={(e) => (!user ? (e.preventDefault(), setAuthModalOpen(true)) : null)}
                            >
                              <span>{t("item.dueLabel", "Due:")}</span>
                              <MiniDatePicker
                                value={dueDateValue}
                                onChange={(ymd) => {
                                  if (!requireAuth()) return;
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
                                onFocus={() => requireAuth()}
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
                                onFocus={() => requireAuth()}
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

                            {/* One-time reminder */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t("item.reminderLabel", "Reminder:")}</span>
                              <label
                                className="flex items-center gap-1"
                                onMouseDown={(e) => (!user ? (e.preventDefault(), setAuthModalOpen(true)) : null)}
                              >
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
                                readOnly={!user}
                                onFocus={() => requireAuth()}
                                onBlur={(e) => handleReminderChange(true, e.target.value)}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              />
                            </div>

                            {/* Repeat reminder */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t("repeat.label", "Repeat:")}</span>
                              <select
                                value={repeat}
                                onFocus={() => requireAuth()}
                                onChange={(e) => {
                                  if (!requireAuth()) return;
                                  const v = e.target.value as RepeatType;

                                  if (v === "none") {
                                    handleRepeatPatch({
                                      reminder_repeat: "none",
                                      reminder_time: null,
                                      reminder_weekdays: null,
                                      reminder_month_day: null,
                                    });
                                    return;
                                  }

                                  if (v === "daily") {
                                    handleRepeatPatch({
                                      reminder_repeat: "daily",
                                      reminder_time: task.reminder_time ?? fromLocalTimeInputToDb("09:00"),
                                      reminder_weekdays: null,
                                      reminder_month_day: null,
                                    });
                                  } else if (v === "weekly") {
                                    const currentDow = new Date().getDay();
                                    handleRepeatPatch({
                                      reminder_repeat: "weekly",
                                      reminder_time: task.reminder_time ?? fromLocalTimeInputToDb("09:00"),
                                      reminder_weekdays: selectedWeekdays?.length ? selectedWeekdays : [currentDow],
                                      reminder_month_day: null,
                                    });
                                  } else {
                                    handleRepeatPatch({
                                      reminder_repeat: "monthly",
                                      reminder_time: task.reminder_time ?? fromLocalTimeInputToDb("09:00"),
                                      reminder_weekdays: null,
                                      reminder_month_day: task.reminder_month_day ?? 1,
                                    });
                                  }
                                }}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              >
                                <option value="none">{t("repeat.none", "None")}</option>
                                <option value="daily">{t("repeat.daily", "Daily")}</option>
                                <option value="weekly">{t("repeat.weekly", "Weekly")}</option>
                                <option value="monthly">{t("repeat.monthly", "Monthly")}</option>
                              </select>

                              <input
                                type="time"
                                value={repeatTimeLocal || "09:00"}
                                readOnly={!user || repeat === "none"}
                                onFocus={() => requireAuth()}
                                onChange={(e) => {
                                  if (!requireAuth()) return;
                                  if (repeat === "none") return;
                                  handleRepeatPatch({ reminder_time: fromLocalTimeInputToDb(e.target.value) });
                                }}
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                                aria-label={t("repeat.timeLabel", "Reminder time")}
                              />
                            </div>

                            {repeat === "weekly" && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px]">{t("repeat.weekly.on", "On:")}</span>
                                {WEEKDAYS.map((d) => {
                                  const active = selectedWeekdays.includes(d.v);
                                  return (
                                    <button
                                      key={d.v}
                                      type="button"
                                      onClick={() => {
                                        if (!requireAuth()) return;
                                        const next = active ? selectedWeekdays.filter((x) => x !== d.v) : [...selectedWeekdays, d.v];
                                        const finalNext = next.length ? next : selectedWeekdays; // don't allow empty
                                        handleRepeatPatch({ reminder_weekdays: finalNext });
                                      }}
                                      className={`px-2 py-1 rounded-lg border text-[10px] ${active
                                          ? "bg-[var(--accent)] text-[var(--bg-body)] border-[var(--accent)]"
                                          : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                    >
                                      {t(d.key, d.fallback)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {repeat === "monthly" && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px]">{t("repeat.monthly.onDay", "On day")}</span>
                                <select
                                  value={monthDay}
                                  onFocus={() => requireAuth()}
                                  onChange={(e) => {
                                    if (!requireAuth()) return;
                                    handleRepeatPatch({ reminder_month_day: Number(e.target.value) });
                                  }}
                                  className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 text-[10px]">
                            <span>
                              {t("item.createdLabel", "Created:")} {new Date(task.created_at).toLocaleString()}
                            </span>
                            {task.completed_at && (
                              <span className="text-[var(--accent)]">
                                {t("item.completedLabel", "Completed:")} {new Date(task.completed_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                          <div className="relative" ref={shareMenuRef}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!requireAuth()) return;
                                setSharingTaskId((prev) => (prev === task.id ? null : task.id));
                              }}
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
