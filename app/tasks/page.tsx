"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/app/lib/analytics";
const { track } = useAnalytics();
type Task = {
  id: string;
  title: string | null;
  description: string | null;
  is_done: boolean;
  due_date: string | null;
  created_at: string | null;
};

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  // 1) Load current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  // 2) Fetch tasks for this user
  async function fetchTasks() {
    if (!user) return;

    try {
      setLoadingList(true);
      setError("");

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("is_done", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setTasks((data || []) as Task[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load tasks.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setTasks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3) Create a new task
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in to create tasks.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    try {
      setCreating(true);

      const { error } = await supabase.from("tasks").insert([
        {
          user_id: user.id,
          title,
          description: description.trim() || null,
          due_date: dueDate || null,
        },
      ]);

      if (error) throw error;

      setTitle("");
      setDescription("");
      setDueDate("");
      fetchTasks();
    } catch (err) {
      console.error(err);
      setError("Failed to create task.");
    } finally {
      setCreating(false);
    }
  }

  // 4) Toggle complete / incomplete
  async function toggleTaskDone(task: Task) {
    if (!user) return;
    setUpdatingId(task.id);
    setError("");

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_done: !task.is_done })
        .eq("id", task.id)
        .eq("user_id", user.id);

      if (error) throw error;

      fetchTasks();
    } catch (err) {
      console.error(err);
      setError("Failed to update task.");
    } finally {
      setUpdatingId(null);
    }
  }

  // 5) Delete a task
  async function deleteTask(taskId: string) {
    if (!user) return;
    setDeletingId(taskId);
    setError("");

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", user.id);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete task.");
    } finally {
      setDeletingId(null);
    }
  }

  // 6) Logout
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTasks([]);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  }
  function handleAskAssistantAboutTask(task: Task) {
    if (typeof window === "undefined" || !task) return;

    const pieces = [
      task.title || "",
      task.description || "",
      task.due_date ? `Due date: ${task.due_date}` : "",
    ].filter(Boolean);

    const content = pieces.join("\n");
    if (!content.trim()) return;

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content,
          hint:
            "Help me prioritize this task and suggest the next 3 small steps.",
        },
      })
    );
  }

  // Checking session
  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">Tasks</h1>
        <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
          You&apos;re not logged in. Log in or create a free account to manage
          your tasks.
        </p>
        <Link
          href="/auth"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Go to login / signup
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <AppHeader active="tasks" />
      {/* Content */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 grid md:grid-cols-[1.1fr,0.9fr] gap-6">
          {/* Left: create task */}
          <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
            <h1 className="text-xl md:text-2xl font-bold mb-3">Tasks</h1>
            <p className="text-xs text-slate-400 mb-4">
              Create tasks, mark them as done, and keep track of what matters.
            </p>

            {error && (
              <div className="mb-3 text-sm text-red-400">{error}</div>
            )}

            <form
              onSubmit={handleCreateTask}
              className="flex flex-col gap-3 text-sm"
            >
              <input
                type="text"
                placeholder="Task title"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                placeholder="Optional details..."
                className="w-full min-h-[80px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition text-sm mt-1"
              >
                {creating ? "Adding task..." : "Add task"}
              </button>
            </form>

            <div className="mt-5 text-xs text-slate-400 flex gap-3">
              <Link href="/notes" className="hover:text-indigo-300">
                ← Go to Notes
              </Link>
              <Link href="/dashboard" className="hover:text-indigo-300">
                Open Dashboard
              </Link>
            </div>
          </section>

          {/* Right: task list */}
          <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Your tasks</h2>
              <button
                onClick={fetchTasks}
                disabled={loadingList}
                className="text-xs px-3 py-1 rounded-lg border border-slate-600 hover:bg-slate-800 disabled:opacity-60"
              >
                {loadingList ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {tasks.length === 0 && !loadingList && (
              <p className="text-slate-400 text-sm">
                No tasks yet. Add your first task on the left.
              </p>
            )}

            <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1 text-sm">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className="border border-slate-800 rounded-xl bg-slate-950/70 p-3 flex gap-3"
                >
                  <button
                    onClick={() => toggleTaskDone(task)}
                    disabled={updatingId === task.id}
                    className="mt-1 h-5 w-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px] hover:bg-slate-800 disabled:opacity-60"
                  >
                    {task.is_done ? "✓" : ""}
                  </button>

                  <div className="flex-1">
                    <h3
                      className={`font-semibold text-xs mb-1 ${
                        task.is_done ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {task.title || "Untitled task"}
                    </h3>
                    {task.description && (
                      <p
                        className={`text-[11px] whitespace-pre-wrap ${
                          task.is_done ? "text-slate-500" : "text-slate-300"
                        }`}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      {task.due_date && (
                        <span className="px-2 py-0.5 rounded-full border border-slate-700">
                          Due: {task.due_date}
                        </span>
                      )}
                      {task.created_at && (
                        <span>
                          Created:{" "}
                          {new Date(task.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={deletingId === task.id}
                    className="self-start text-[11px] text-slate-500 hover:text-red-400 disabled:opacity-60"
                  >
                    {deletingId === task.id ? "..." : "Delete"}
                  </button>

                                    <button
                    onClick={() => handleAskAssistantAboutTask(task)}
                    className="text-[11px] text-slate-500 hover:text-indigo-300"
                  >
                    🤖 Ask AI
                  </button>
                </article>
                track("task_created");
              ))}
            </div>
          </section>
        </div>
        <FeedbackForm user={user} />
      </div>
    </main>
  );
}
