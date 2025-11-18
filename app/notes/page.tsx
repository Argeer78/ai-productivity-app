"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import FeedbackForm from "@/app/components/FeedbackForm";
import { useAnalytics } from "@/lib/analytics";

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
};

type AiMode = "summarize" | "bullets" | "rewrite";

export default function NotesPage() {
  const { track } = useAnalytics();

  const [user, setUser] = useState<SupabaseUser>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
 // ✅ NEW: date picker state (default to today)
const [noteDate, setNoteDate] = useState<string>(() =>
  new Date().toISOString().split("T")[0]
);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const [aiCountToday, setAiCountToday] = useState(0);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [billingLoading, setBillingLoading] = useState(false);

  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // NEW: edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleShareNote(note: Note) {
    if (!note || !note.content) return;

    const textToCopy = `${note.content}\n\n— shared from AI Productivity Hub`;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setCopiedNoteId(note.id);
          setTimeout(() => setCopiedNoteId(null), 2000);
          try {
            track("note_shared");
          } catch {
            // ignore analytics errors
          }
        })
        .catch((err) => {
          console.error("Failed to copy note:", err);
        });
    }
  }

  function handleAskAssistantAboutNote(note: Note) {
    if (typeof window === "undefined" || !note) return;

    const c = note.content || "";
    if (!c.trim()) return;

    try {
      window.dispatchEvent(
        new CustomEvent("ai-assistant-context", {
          detail: {
            content: c,
            hint:
              "Help me turn this note into 3 clear next actions and a short summary.",
          },
        })
      );
      try {
        track("ask_ai_from_note");
      } catch {
        // ignore analytics errors
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 1) Load current user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        setUser((data?.user as any) ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUser();
  }, []);

  // 2) Ensure profile exists & fetch plan
  async function ensureProfileAndPlan() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              email: user.email,
              plan: "free",
            },
          ])
          .select("plan")
          .single();

        if (insertError) throw insertError;
        setPlan((inserted?.plan as "free" | "pro") || "free");
      } else {
        setPlan((data.plan as "free" | "pro") || "free");
      }
    } catch (err) {
      console.error(err);
      // keep default free
    }
  }

  // 3) Fetch notes for user
  async function fetchNotes() {
    if (!user) return;

    try {
      setLoadingList(true);
      setError("");

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data || []) as Note[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load notes.");
    } finally {
      setLoadingList(false);
    }
  }

  // 4) Fetch today's AI usage
  async function fetchAiUsage() {
    if (!user) return;

    try {
      const today = getTodayString();

      const { data, error } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        throw error;
      }

      setAiCountToday(data?.count || 0);
    } catch (err) {
      console.error(err);
    }
  }

  // When user changes, load everything
  useEffect(() => {
    if (user) {
      ensureProfileAndPlan();
      fetchNotes();
      fetchAiUsage();
    } else {
      setNotes([]);
      setAiCountToday(0);
      setPlan("free");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

  // 5) Save new note
 async function handleSaveNote(e: React.FormEvent) {
  e.preventDefault();
  setError("");

  if (!user) {
    setError("You must be logged in to save notes.");
    return;
  }

  if (!title.trim() && !content.trim()) {
    setError("Please enter a title or content.");
    return;
  }

  try {
    setLoading(true);

    // ✅ build an ISO date from the chosen noteDate
    const createdAtIso = noteDate
      ? new Date(`${noteDate}T00:00:00.000Z`).toISOString()
      : new Date().toISOString();

    const { error } = await supabase.from("notes").insert([
      {
        title,
        content,
        user_id: user.id,
        created_at: createdAtIso, // ✅ use chosen date
      },
    ]);

    if (error) throw error;

    setTitle("");
    setContent("");
    // reset date back to today (optional)
    setNoteDate(new Date().toISOString().split("T")[0]);

    await fetchNotes();

    try {
      track("note_created");
    } catch {
      // ignore analytics errors
    }
  } catch (err) {
    console.error(err);
    setError("Failed to save note.");
  } finally {
    setLoading(false);
  }
}

  // 6) Increment AI usage
  async function incrementAiUsage(): Promise<number> {
    if (!user) return aiCountToday;

    const today = getTodayString();

    const { data, error } = await supabase
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (error && (error as any).code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      const { error: insertError } = await supabase.from("ai_usage").insert([
        {
          user_id: user.id,
          usage_date: today,
          count: 1,
        },
      ]);
      if (insertError) throw insertError;
      setAiCountToday(1);
      return 1;
    } else {
      const newCount = (data.count || 0) + 1;
      const { error: updateError } = await supabase
        .from("ai_usage")
        .update({ count: newCount })
        .eq("id", data.id);

      if (updateError) throw updateError;
      setAiCountToday(newCount);
      return newCount;
    }
  }

  // 7) AI call
  async function handleAI(
    noteId: string,
    noteContent: string | null,
    mode: AiMode = "summarize"
  ) {
    if (!user) {
      setError("You must be logged in to use AI.");
      return;
    }

    if (!noteContent || !noteContent.trim()) {
      setError("This note is empty, nothing to send to AI.");
      return;
    }

    if (remaining <= 0) {
      setError(
        `You reached your daily AI limit for the ${plan} plan (${dailyLimit}).`
      );
      return;
    }

    setAiLoading(noteId);
    setError("");

    try {
      const res = await fetch("/api/ai/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent, mode }),
      });

      const data = await res.json();

      if (!data.result) {
        throw new Error("No AI result returned.");
      }

      const aiText: string = data.result;

      const { error: updateError } = await supabase
        .from("notes")
        .update({ ai_result: aiText })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const newCount = await incrementAiUsage();
      await fetchNotes();

      try {
        track("ai_call_used", {
          feature: `note_${mode}`,
          plan,
          usedToday: newCount,
        });
      } catch {
        // ignore analytics errors
      }
    } catch (err) {
      console.error(err);
      setError("AI request or saving result failed.");
    } finally {
      setAiLoading(null);
    }
  }

  // 8) Edit note
  function startEdit(note: Note) {
    setEditingNoteId(note.id);
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function saveEdit(noteId: string) {
    if (!user) return;
    if (!editTitle.trim() && !editContent.trim()) {
      setError("Please keep at least a title or some content.");
      return;
    }

    try {
      setSavingEditId(noteId);
      setError("");

      const { error } = await supabase
        .from("notes")
        .update({
          title: editTitle,
          content: editContent,
        })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchNotes();
      cancelEdit();
    } catch (err) {
      console.error(err);
      setError("Failed to update note.");
    } finally {
      setSavingEditId(null);
    }
  }

  // 9) Delete note
  async function handleDelete(noteId: string) {
    if (!user) return;

    const confirmed = window.confirm(
      "Delete this note? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeletingId(noteId);
      setError("");

      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete note.");
    } finally {
      setDeletingId(null);
    }
  }

  // 10) Stripe checkout start (optional upgrade from notes)
  async function startCheckout() {
    if (!user) return;
    setBillingLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to start checkout.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to start checkout.");
    } finally {
      setBillingLoading(false);
    }
  }

  // 11) Logout
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setNotes([]);
      setAiCountToday(0);
      setPlan("free");
    } catch (err) {
      console.error(err);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300">Checking session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-3">Notes</h1>
        <p className="text-slate-300 mb-4 text-center max-w-md">
          You&apos;re not logged in. Please log in or sign up to create and
          view your notes.
        </p>
        <a
          href="/auth"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Go to login / signup
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <AppHeader active="notes" />

      <div className="max-w-5xl mx-auto mt-6 grid gap-6 md:grid-cols-[1.2fr,1fr]">
        {/* Create note */}
        <section className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Create a new note</h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Use notes with AI to summarize, bullet, or rewrite.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
            >
              Log out
            </button>
          </div>

          {error && (
            <div className="mb-3 text-sm text-red-400">{error}</div>
          )}

          <form onSubmit={handleSaveNote} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Note title"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

{/* ✅ Tiny date picker */}
  <div className="flex items-center gap-2 text-[11px] text-slate-400">
    <span className="whitespace-nowrap">Note date:</span>
    <input
      type="date"
      value={noteDate}
      onChange={(e) => setNoteDate(e.target.value)}
      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
    />
    <span className="text-[10px] text-slate-500">
      Used for sorting & display.
    </span>
  </div>
            <textarea
              placeholder="Write your note here..."
              className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                Plan:{" "}
                <span className="font-semibold uppercase">{plan}</span> • AI
                today:{" "}
                <span className="font-semibold">
                  {aiCountToday}/{dailyLimit}
                </span>
              </span>
              <span>
                This AI limit is shared with dashboard, planner & assistant.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition text-sm mt-1"
            >
              {loading ? "Saving..." : "Save note"}
            </button>

            {plan === "free" && (
              <div className="mt-3 text-[11px] text-slate-400">
                Hitting the limit often?{" "}
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={startCheckout}
                  className="underline text-indigo-300 disabled:opacity-60"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Notes list */}
        <section className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your notes</h2>
            <button
              onClick={fetchNotes}
              disabled={loadingList}
              className="text-sm px-3 py-1 rounded-lg border border-slate-600 hover:bg-slate-800 disabled:opacity-60"
            >
              {loadingList ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {notes.length === 0 && !loadingList && (
            <p className="text-slate-400 text-sm">
              No notes yet. Create your first note on the left.
            </p>
          )}

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {notes.map((note) => {
              const isEditing = editingNoteId === note.id;

              return (
                <article
                  key={note.id}
                  className="border border-slate-800 rounded-xl p-3 bg-slate-950/60"
                >
                  {/* VIEW MODE */}
                  {!isEditing && (
                    <>
                      <h3 className="font-semibold text-sm mb-1">
                        {note.title || "Untitled note"}
                      </h3>

                      {note.content && (
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-slate-500">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleString()
                          : ""}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "summarize")
                          }
                          disabled={
                            aiLoading === note.id || remaining === 0
                          }
                          className="text-xs px-3 py-1 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                          {aiLoading === note.id
                            ? "Summarizing..."
                            : "✨ Summarize"}
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "bullets")
                          }
                          disabled={
                            aiLoading === note.id || remaining === 0
                          }
                          className="text-xs px-3 py-1 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                          📋 Bullets
                        </button>

                        <button
                          onClick={() =>
                            handleAI(note.id, note.content, "rewrite")
                          }
                          disabled={
                            aiLoading === note.id || remaining === 0
                          }
                          className="text-xs px-3 py-1 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                          ✍️ Rewrite
                        </button>

                        <button
                          onClick={() => handleShareNote(note)}
                          className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
                        >
                          {copiedNoteId === note.id
                            ? "✅ Copied"
                            : "Share (copy)"}
                        </button>

                        <button
                          onClick={() => handleAskAssistantAboutNote(note)}
                          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px]"
                        >
                          🤖 Ask AI about this
                        </button>

                        {/* Edit + Delete */}
                        <button
                          onClick={() => startEdit(note)}
                          className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-[11px]"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="px-2 py-1 rounded-lg border border-red-500/70 text-[11px] text-red-300 hover:bg-red-900/30 disabled:opacity-60"
                        >
                          {deletingId === note.id
                            ? "Deleting..."
                            : "🗑 Delete"}
                        </button>
                      </div>

                      {note.ai_result && (
                        <div className="mt-3 text-xs text-slate-200 border-t border-slate-800 pt-2 whitespace-pre-wrap">
                          <strong>AI Result (saved):</strong>
                          <br />
                          {note.ai_result}
                        </div>
                      )}
                    </>
                  )}

                  {/* EDIT MODE */}
                  {isEditing && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                        placeholder="Note title"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) =>
                          setEditContent(e.target.value)
                        }
                        className="w-full min-h-[100px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                        placeholder="Edit your note..."
                      />
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => saveEdit(note.id)}
                          disabled={savingEditId === note.id}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
                        >
                          {savingEditId === note.id
                            ? "Saving..."
                            : "Save changes"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-900"
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

          <div className="mt-4 text-[11px] text-slate-400 flex gap-3">
            <Link href="/tasks" className="hover:text-indigo-300">
              → Go to Tasks
            </Link>
            <Link href="/dashboard" className="hover:text-indigo-300">
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
