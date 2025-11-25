"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type TaskRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  completed: boolean | null;
  due_date: string | null; // ISO string in DB
  created_at: string;
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

  // derive initial display month from value or today
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
  // build 6 rows max
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
    <div className="relative inline-block text-[11px] text-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-100 hover:bg-slate-900"
      >
        <span>{selectedYmd || "Pick date"}</span>
        <span className="text-[10px] opacity-70">📅</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-52 rounded-xl border border-slate-800 bg-slate-950 shadow-xl p-2">
          <div className="flex items-center justify-between mb-1 text-[11px]">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-1 text-slate-300 hover:text-slate-100"
            >
              ‹
            </button>
            <span className="font-semibold text-slate-100">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-1 text-slate-300 hover:text-slate-100"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[10px] text-slate-400 mb-1">
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
                      className="h-6 text-center text-slate-700"
                    >
                      {/* empty cell */}
                    </span>
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
                        ? "bg-indigo-600 text-white"
                        : "text-slate-100 hover:bg-slate-800"
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

  const [savingNew, setSavingNew] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // view mode: active / completed / all
  const [viewMode, setViewMode] = useState<"active" | "completed" | "all">(
    "active"
  );

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
            "id, user_id, title, description, completed, due_date, created_at"
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

  async function handleAddTask(e: React.FormEvent) {
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
            completed: false, // ✅ correct column
            due_date: dueDateIso,
          },
        ])
        .select(
          "id, user_id, title, description, completed, due_date, created_at"
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
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: newDone }) // ✅ correct column
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at"
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
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, title, description, completed, due_date, created_at"
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
    } catch (err) {
      console.error("[tasks] delete exception", err);
      setError("Could not delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="tasks" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Tasks</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to track your tasks.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  // filter tasks based on view mode
  const filteredTasks = tasks.filter((task) => {
    const done = !!task.completed;
    if (viewMode === "active") return !done;
    if (viewMode === "completed") return done;
    return true; // "all"
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="tasks" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Tasks</h1>
          <p className="text-xs md:text-sm text-slate-400 mb-4">
            Capture tasks, check them off, and keep track of your progress.
          </p>

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

          {/* New task form */}
          <form
            onSubmit={handleAddTask}
            className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 text-sm"
          >
            <p className="text-[11px] font-semibold text-slate-300">
              Add a new task
            </p>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title…"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 mb-2"
            />

            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description or notes…"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 mb-2 min-h-[60px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="text-[11px]">Due date</span>
                {/* ✅ mini calendar for new task */}
                <MiniDatePicker
                  value={newDueDate}
                  onChange={(val) => setNewDueDate(val)}
                />
              </div>

              <button
                type="submit"
                disabled={savingNew}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs"
              >
                {savingNew ? "Adding…" : "Add task"}
              </button>
            </div>
          </form>

          {/* View mode toggle */}
          {tasks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
              <span className="text-slate-500 mr-1">View:</span>
              <button
                type="button"
                onClick={() => setViewMode("active")}
                className={`rounded-full px-3 py-1 border text-xs ${
                  viewMode === "active"
                    ? "bg-slate-800 border-slate-500 text-slate-50"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setViewMode("completed")}
                className={`rounded-full px-3 py-1 border text-xs ${
                  viewMode === "completed"
                    ? "bg-slate-800 border-slate-500 text-slate-50"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                History
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`rounded-full px-3 py-1 border text-xs ${
                  viewMode === "all"
                    ? "bg-slate-800 border-slate-500 text-slate-50"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                All
              </button>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <p className="text-sm text-slate-300">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-400">
              No tasks yet. Add your first one above.
            </p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-slate-400">
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

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                     <div className="flex items-center gap-2 mt-1">
  <button
    type="button"
    onClick={() => toggleDone(task)}
    disabled={isSaving}
    title={task.completed ? "Mark as not completed" : "Mark as completed"}
    className={`h-4 w-4 flex-shrink-0 rounded-full border transition ${
      task.completed
        ? "border-emerald-400 bg-emerald-500/80"
        : "border-slate-600 bg-slate-950 hover:border-slate-400"
    }`}
    aria-label="Toggle done"
  />

  <span className="text-[10px] text-slate-400">
    {task.completed ? "Completed" : "Mark as done"}
  </span>
</div>

                      <div className="flex-1 space-y-2">
                        {/* Editable title */}
                        <input
                          type="text"
                          defaultValue={task.title || ""}
                          onBlur={(e) =>
                            handleUpdateTask(task, {
                              title: e.target.value,
                            })
                          }
                          className="w-full bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-500"
                          placeholder="(untitled task)"
                        />

                        {/* Editable description */}
                        <textarea
                          defaultValue={task.description || ""}
                          onBlur={(e) =>
                            handleUpdateTask(task, {
                              description: e.target.value,
                            })
                          }
                          className="w-full rounded-xl bg-slate-950/70 border border-slate-800 px-2 py-1 text-xs text-slate-100 min-h-[48px]"
                          placeholder="Details or notes…"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>Due:</span>
                            {/* ✅ mini calendar for existing task */}
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

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500">
                              Created:{" "}
                              {new Date(
                                task.created_at
                              ).toLocaleDateString()}
                            </span>
                            {task.completed && (
                              <span className="text-[10px] text-emerald-400">
                                Completed
                              </span>
                            )}
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
        </div>
      </div>
    </main>
  );
}
