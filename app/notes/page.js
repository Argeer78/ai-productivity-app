"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export default function NotesPage() {
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(null);

  const [aiCountToday, setAiCountToday] = useState(0);
  const [plan, setPlan] = useState("free");
  const [billingLoading, setBillingLoading] = useState(false);

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

  // 2) Ensure profile exists & fetch plan
  async function ensureProfileAndPlan() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        // create default profile
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
        setPlan(inserted.plan);
      } else {
        setPlan(data.plan || "free");
      }
    } catch (err) {
      console.error(err);
      // keep default plan = free
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
      setNotes(data || []);
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

      if (error && error.code !== "PGRST116") {
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

  // 5) Save note
  async function handleSaveNote(e) {
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

      const { error } = await supabase.from("notes").insert([
        {
          title,
          content,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      setTitle("");
      setContent("");
      fetchNotes();
    } catch (err) {
      console.error(err);
      setError("Failed to save note.");
    } finally {
      setLoading(false);
    }
  }

  // 6) Increment AI usage
  async function incrementAiUsage() {
    const today = getTodayString();

    const { data, error } = await supabase
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
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
    } else {
      const newCount = (data.count || 0) + 1;
      const { error: updateError } = await supabase
        .from("ai_usage")
        .update({ count: newCount })
        .eq("id", data.id);

      if (updateError) throw updateError;
      setAiCountToday(newCount);
    }
  }

  // 7) AI call
  async function handleAI(noteId, noteContent, mode = "summarize") {
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

      const aiText = data.result;

      const { error: updateError } = await supabase
        .from("notes")
        .update({ ai_result: aiText })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await incrementAiUsage();
      await fetchNotes();
    } catch (err) {
      console.error(err);
      setError("AI request or saving result failed.");
    } finally {
      setAiLoading(null);
    }
  }

  // 8) Stripe checkout start (we'll implement backend next)
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

  // 9) Logout
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur mb-6">
  <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    {/* Left: logo + nav */}
    <div className="flex items-center gap-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
          AI
        </div>
        <span className="text-sm font-semibold tracking-tight">
          AI Productivity Hub
        </span>
      </Link>
      <nav className="hidden sm:flex items-center gap-3 text-xs text-slate-300">
        <Link href="/notes" className="hover:text-white">
          Notes
        </Link>
        <Link href="/tasks" className="hover:text-white">
          Tasks
        </Link>
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
      </nav>
    </div>

    {/* Right: plan, usage, user, buttons */}
    <div className="flex flex-col items-end gap-1 text-xs text-slate-300">
      <p className="text-[11px] text-slate-400">
        Plan:{" "}
        <span className="font-semibold">{plan.toUpperCase()}</span> | AI
        today: {aiCountToday}/{dailyLimit}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden sm:inline">
          Logged in as <span className="font-semibold">{user.email}</span>
        </span>
        {plan === "free" && (
          <button
            onClick={startCheckout}
            disabled={billingLoading}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
          >
            {billingLoading ? "Opening Stripe..." : "Upgrade to Pro"}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900"
        >
          Log out
        </button>
      </div>
    </div>
  </div>
</header>
      {/* rest of the page: create note + list (unchanged below) */}
      <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
        {/* Create note */}
        <section className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60">
          <h2 className="text-lg font-semibold mb-3">Create a new note</h2>

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

            <textarea
              placeholder="Write your note here..."
              className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition text-sm"
            >
              {loading ? "Saving..." : "Save note"}
            </button>
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
            {notes.map((note) => (
              <article
                key={note.id}
                className="border border-slate-800 rounded-xl p-3 bg-slate-950/60"
              >
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
                    disabled={aiLoading === note.id || remaining === 0}
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
                    disabled={aiLoading === note.id || remaining === 0}
                    className="text-xs px-3 py-1 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    📋 Bullets
                  </button>

                  <button
                    onClick={() =>
                      handleAI(note.id, note.content, "rewrite")
                    }
                    disabled={aiLoading === note.id || remaining === 0}
                    className="text-xs px-3 py-1 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    ✍️ Rewrite
                  </button>
                </div>

                {note.ai_result && (
                  <div className="mt-3 text-xs text-slate-200 border-t border-slate-800 pt-2 whitespace-pre-wrap">
                    <strong>AI Result (saved):</strong>
                    <br />
                    {note.ai_result}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
