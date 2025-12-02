"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import FeedbackForm from "@/app/components/FeedbackForm";

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
};

type MiniDatePickerProps = {
  value: string; // "yyyy-mm-dd" or ""
  onChange: (val: string) => void;
};

function getDaysInMonth(year: number, month: number) {
  // month is 0-based
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

/**
 * A tiny inline calendar for picking dates.
 * Uses local month navigation and returns a "yyyy-mm-dd" string.
 */
function MiniDatePicker({ value, onChange }: MiniDatePickerProps) {
  const [open, setOpen] = useState(false);

  const baseDate = value
    ? new Date(value + "T00:00:00")
    : new Date(); // today

  const [year, setYear] = useState(baseDate.getFullYear());
  const [month, setMonth] = useState(baseDate.getMonth()); // 0-11

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

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = getDaysInMonth(year, month);

  const weeks: (number | null)[][] = [];
  let currentDay = 1 - firstDay;

  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        week.push(null);
      } else {
        week.push(currentDay);
      }
      currentDay++;
    }
    weeks.push(week);
  }

  const selectedYmd = value || "";

  function handleSelectDay(day: number | null) {
    if (!day) return;
    const date = new Date(year, month, day);
    const ymd = toYmd(date);
    onChange(ymd);
    setOpen(false);
  }

  return (
    <div className="relative inline-block text-[11px] text-[var(--text-main)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      >
        <span>{selectedYmd || "Pick date"}</span>
        <span className="text-[10px] opacity-70">📅</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-52 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-2">
          <div className="flex items-center justify-between mb-1 text-[11px] text-[var(--text-main)]">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-1 hover:text-[var(--accent)]"
            >
              ‹
            </button>
            <span className="font-semibold">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-1 hover:text-[var(--accent)]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[10px] text-[var(--text-muted)] mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
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

// 24h time dropdown options (00:00 - 23:00)
const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`);

// Category list
const TASK_CATEGORIES = [
  "Work",
  "Personal",
  "Health",
  "Study",
  "Errands",
  "Home",
  "Travel",
  "Other",
] as const;

// Theme-aware category badges (unified style like Notes)
const taskCategoryStyles: Record<string, string> = {
  Work: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Personal:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Health:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Study:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Errands:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Home: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Travel:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
  Other:
    "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
};

// Single-task share text
function getTaskShareText(task: TaskRow): string {
  const lines: string[] = [];

  lines.push(`Task: ${task.title || "(untitled task)"}`);

  if (task.category) {
    lines.push(`Category: ${task.category}`);
  }

  if (task.due_date) {
    const date = new Date(task.due_date);
    const dateStr = date.toLocaleDateString();
    lines.push(`When: ${dateStr}`);
  }

  if (task.time_from || task.time_to) {
    const from = task.time_from || "--:--";
    const to = task.time_to || "--:--";
    lines.push(`Time: ${from}–${to}`);
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

// Multi-task share text (for today / selected)
function getTasksShareText(tasks: TaskRow[], header: string): string {
  const lines: string[] = [];

  lines.push(header);
  lines.push("");

  tasks.forEach((task, idx) => {
    lines.push(`${idx + 1}. ${task.title || "(untitled task)"}`);
    if (task.category) {
      lines.push(`   Category: ${task.category}`);
    }
    if (task.due_date) {
      const date = new Date(task.due_date);
      lines.push(`   When: ${date.toLocaleDateString()}`);
    }
    if (task.time_from || task.time_to) {
      const from = task.time_from || "--:--";
      const to = task.time_to || "--:--";
      lines.push(`   Time: ${from}–${to}`);
    }
    if (task.description) {
      lines.push(`   Notes: ${task.description}`);
    }
    lines.push("");
  });

  lines.push("— Shared from AI Productivity Hub");

  return lines.join("\n");
}

export default function TasksPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // new task form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState<string>(""); // yyyy-mm-dd
  const [newCategory, setNewCategory] = useState<string>(""); // category name
  const [newTimeFrom, setNewTimeFrom] = useState<string>("");
  const [newTimeTo, setNewTimeTo] = useState<string>("");

  const [savingNew, setSavingNew] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // view mode: active / completed / all
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">(
    "active"
  );

  // category filter
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // share UI state
  const [sharingTaskId, setSharingTaskId] = useState<string | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const todayYmd = new Date().toISOString().slice(0, 10);

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[tasks] getUser error", error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[tasks] getUser exception", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load tasks for logged-in user
  useEffect(() => {
    if (!user) return;

    async function loadTasks() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(
            "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[tasks] loadTasks error", error);
          setError("Failed to load tasks.");
          setTasks([]);
          return;
        }

        setTasks((data || []) as TaskRow[]);
      } catch (err) {
        console.error("[tasks] loadTasks exception", err);
        setError("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
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
        newDueDate.trim() !== ""
          ? new Date(newDueDate + "T00:00:00").toISOString()
          : null;

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
          },
        ])
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to"
        )
        .single();

      if (error) {
        console.error("[tasks] insert error", error);
        setError("Failed to add task.");
        return;
      }

      if (data) {
        setTasks((prev) => [data as TaskRow, ...prev]);
      }

      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewCategory("");
      setNewTimeFrom("");
      setNewTimeTo("");
    } catch (err) {
      console.error("[tasks] insert exception", err);
      setError("Failed to add task.");
    } finally {
      setSavingNew(false);
    }
  }

  async function toggleDone(task: TaskRow) {
    if (!user) return;

    const newDone = !task.completed;
    setSavingTaskId(task.id);
    setError("");

    try {
      const updates: Partial<TaskRow> = {
        completed: newDone,
        completed_at: newDone ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to"
        )
        .single();

      if (error) {
        console.error("[tasks] toggleDone error", error);
        setError("Could not update task.");
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? ((data as TaskRow) || t) : t))
      );
    } catch (err) {
      console.error("[tasks] toggleDone exception", err);
      setError("Could not update task.");
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
          category:
            updates.category !== undefined ? updates.category : task.category,
          time_from:
            updates.time_from !== undefined
              ? updates.time_from
              : task.time_from,
          time_to:
            updates.time_to !== undefined ? updates.time_to : task.time_to,
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at, completed_at, category, time_from, time_to"
        )
        .single();

      if (error) {
        console.error("[tasks] update error", error);
        setError("Could not save task.");
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? ((data as TaskRow) || t) : t))
      );
    } catch (err) {
      console.error("[tasks] update exception", err);
      setError("Could not save task.");
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleDeleteTask(task: TaskRow) {
    if (!user) return;
    if (!window.confirm("Delete this task?")) return;

    setDeletingTaskId(task.id);
    setError("");

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[tasks] delete error", error);
        setError("Could not delete task.");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setSelectedTaskIds((prev) => prev.filter((id) => id !== task.id));
    } catch (err) {
      console.error("[tasks] delete exception", err);
      setError("Could not delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  }

  // selection toggle
  function toggleSelected(taskId: string) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  // share handlers for single task
  function handleShareCopy(task: TaskRow) {
    const text = getTaskShareText(task);

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedTaskId(task.id);
          setTimeout(() => setCopiedTaskId(null), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
        });
    }
  }

  function handleShareWhatsApp(task: TaskRow) {
    const text = encodeURIComponent(getTaskShareText(task));
    const url = `https://wa.me/?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  function handleShareViber(task: TaskRow) {
    const text = encodeURIComponent(getTaskShareText(task));
    const url = `viber://forward?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  function handleShareEmail(task: TaskRow) {
    const subject = encodeURIComponent(
      `Task: ${task.title || "Shared task from AI Productivity Hub"}`
    );
    const body = encodeURIComponent(getTaskShareText(task));
    const url = `mailto:?subject=${subject}&body=${body}`;
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  }

  // bulk: today's tasks vs selected tasks (copy-only)
  function handleBulkCopy(mode: "today" | "selected") {
    let list: TaskRow[];

    if (mode === "today") {
      list = tasks.filter((t) => {
        const created = t.created_at?.slice(0, 10) === todayYmd;
        const due = t.due_date && t.due_date.slice(0, 10) === todayYmd;
        return created || due;
      });
    } else {
      list = tasks.filter((t) => selectedTaskIds.includes(t.id));
    }

    if (list.length === 0) {
      if (mode === "today") {
        alert("No tasks for today to share.");
      } else {
        alert("No tasks selected to share.");
      }
      return;
    }

    const header =
      mode === "today"
        ? `Today's tasks (${todayYmd})`
        : `Selected tasks (${list.length})`;

    const text = getTasksShareText(list, header);

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert(
            mode === "today"
              ? "Today's tasks copied to clipboard."
              : "Selected tasks copied to clipboard."
          );
        })
        .catch((err) => {
          console.error("Bulk copy failed", err);
          alert("Failed to copy tasks to clipboard.");
        });
    } else {
      alert("Clipboard not available. Please copy manually.");
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          Checking your session…
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="tasks" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Tasks</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to track your tasks.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--bg-body)]"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  // filter tasks based on view mode + category
  const filteredTasks = tasks.filter((task) => {
    const done = !!task.completed;

    const passesView =
      viewMode === "active" ? !done : viewMode === "completed" ? done : true;

    const passesCategory =
      categoryFilter === "all"
        ? true
        : (task.category || "") === categoryFilter;

    return passesView && passesCategory;
  });

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="tasks" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Tasks</h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-4">
            Capture tasks, check them off, and keep track of your progress.
          </p>

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          {/* New task form */}
          <form
            onSubmit={handleAddTask}
            className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--text-main)]">
                Add a new task
              </p>

              <Link
                href="/ai-task-creator"
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
              >
                🤖 AI Task Creator
              </Link>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title…"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2"
            />

            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description or notes…"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-main)] mb-2 min-h-[60px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Due date
                </span>
                <MiniDatePicker
                  value={newDueDate}
                  onChange={(val) => setNewDueDate(val)}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Category
                </span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">None</option>
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-main)] flex-wrap">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Time (optional)
                </span>
                <select
                  value={newTimeFrom}
                  onChange={(e) => setNewTimeFrom(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">From</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span>–</span>
                <select
                  value={newTimeTo}
                  onChange={(e) => setNewTimeTo(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                >
                  <option value="">To</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingNew}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-xs text-[var(--bg-body)]"
              >
                {savingNew ? "Adding…" : "Add task"}
              </button>
            </div>
          </form>

          {/* View mode + Category filter */}
          {tasks.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3 items-center text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] mr-1">View:</span>
                <button
                  type="button"
                  onClick={() => setViewMode("active")}
                  className={`rounded-full px-3 py-1 border text-xs ${
                    viewMode === "active"
                      ? "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-main)]"
                      : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("completed")}
                  className={`rounded-full px-3 py-1 border text-xs ${
                    viewMode === "completed"
                      ? "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-main)]"
                      : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  History
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={`rounded-full px-3 py-1 border text-xs ${
                    viewMode === "all"
                      ? "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-main)]"
                      : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  All
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-full px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)]"
                >
                  <option value="all">All</option>
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="">No category</option>
                </select>
              </div>
            </div>
          )}

          {/* Bulk selection + share */}
          {tasks.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <span>Selected: {selectedTaskIds.length}</span>
                {selectedTaskIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds([])}
                    className="px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
                <span>Share:</span>
                <button
                  type="button"
                  onClick={() => handleBulkCopy("today")}
                  className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                >
                  Copy today&apos;s tasks
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCopy("selected")}
                  className="px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                >
                  Copy selected tasks
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">
              Loading tasks…
            </p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No tasks yet. Add your first one above.
            </p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No tasks in this view. Try switching filters above.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isSaving = savingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;
                const dueDateValue = task.due_date
                  ? task.due_date.slice(0, 10)
                  : "";
                const completedAt = task.completed_at
                  ? new Date(task.completed_at)
                  : null;

                const cat = task.category || "Other";
                const catClass =
                  taskCategoryStyles[cat] || taskCategoryStyles["Other"];

                const isSelected = selectedTaskIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* Left: done toggle + selection */}
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleDone(task)}
                            disabled={isSaving}
                            title={
                              task.completed
                                ? "Mark as not completed"
                                : "Mark as completed"
                            }
                            className={`h-4 w-4 flex-shrink-0 rounded-full border transition ${
                              task.completed
                                ? "border-[var(--accent)] bg-[var(--accent)]"
                                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]"
                            }`}
                            aria-label="Toggle done"
                          />
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {task.completed ? "Completed" : "Mark as done"}
                          </span>
                        </div>

                        <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(task.id)}
                            className="h-3 w-3 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                          />
                          <span>Select</span>
                        </label>
                      </div>

                      {/* Right: main content */}
                      <div className="flex-1 space-y-2">
                        {/* Top row: title + category */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <input
                            type="text"
                            defaultValue={task.title || ""}
                            onBlur={(e) =>
                              handleUpdateTask(task, {
                                title: e.target.value,
                              })
                            }
                            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                            placeholder="(untitled task)"
                          />

                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={task.category || ""}
                              onChange={(e) =>
                                handleUpdateTask(task, {
                                  category: e.target.value || null,
                                })
                              }
                              className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                            >
                              <option value="">No category</option>
                              {TASK_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>

                            {task.category && (
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${catClass}`}
                              >
                                {task.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <textarea
                          defaultValue={task.description || ""}
                          onBlur={(e) =>
                            handleUpdateTask(task, {
                              description: e.target.value,
                            })
                          }
                          className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-main)] min-h-[48px]"
                          placeholder="Details or notes…"
                        />

                        {/* Bottom row: due / time / created / completed + share + delete */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span>Due:</span>
                              <MiniDatePicker
                                value={dueDateValue}
                                onChange={(ymd) => {
                                  const iso = new Date(
                                    ymd + "T00:00:00"
                                  ).toISOString();
                                  handleUpdateTask(task, {
                                    due_date: iso,
                                  });
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Time:</span>
                              <select
                                defaultValue={task.time_from || ""}
                                onChange={(e) =>
                                  handleUpdateTask(task, {
                                    time_from: e.target.value || null,
                                  })
                                }
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              >
                                <option value="">From</option>
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <span>–</span>
                              <select
                                defaultValue={task.time_to || ""}
                                onChange={(e) =>
                                  handleUpdateTask(task, {
                                    time_to: e.target.value || null,
                                  })
                                }
                                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--text-main)]"
                              >
                                <option value="">To</option>
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <span className="text-[10px]">
                              Created:{" "}
                              {new Date(
                                task.created_at
                              ).toLocaleString()}
                            </span>

                            {completedAt && (
                              <span className="text-[10px] text-[var(--accent)]">
                                Completed: {completedAt.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Share menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setSharingTaskId((prev) =>
                                    prev === task.id ? null : task.id
                                  )
                                }
                                className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                              >
                                {copiedTaskId === task.id
                                  ? "✅ Copied"
                                  : "Share"}
                              </button>

                              {sharingTaskId === task.id && (
                                <div className="absolute right-0 mt-1 w-40 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-2 text-[11px] z-10">
                                  <button
                                    type="button"
                                    onClick={() => handleShareCopy(task)}
                                    className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                  >
                                    📋 Copy text
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleShareWhatsApp(task)
                                    }
                                    className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleShareViber(task)
                                    }
                                    className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                  >
                                    📲 Viber
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleShareEmail(task)
                                    }
                                    className="w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-elevated)]"
                                  >
                                    ✉️ Email
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task)}
                              disabled={isDeleting}
                              className="text-[11px] text-red-400 hover:text-red-300"
                            >
                              {isDeleting ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  Send feedback about Tasks
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mb-3 text-center">
                  Spot a bug, missing feature, or something confusing? Let me
                  know.
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
