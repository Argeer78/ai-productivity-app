// app/ai-companion/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";
import { supabase } from "@/lib/supabaseClient";

type ThreadRow = {
  id: string;
  title: string;
  category: string | null;
  created_at?: string;
  updated_at?: string;
  summary?: string | null;
};

type MsgRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

const CATEGORIES = ["General", "Mindset", "Stress", "Relationships", "Work", "Reflection"] as const;
type Category = (typeof CATEGORIES)[number];

const STARTER_PROMPTS: { label: string; text: string }[] = [
  { label: "How can you help me today?", text: "How can you help me today?" },
  { label: "How do you feel today?", text: "How do you feel today?" },
  { label: "I feel overwhelmed.", text: "I feel overwhelmed and I don’t know why." },
  { label: "Help me calm down.", text: "Help me calm down and feel grounded." },
  { label: "I'm anxious.", text: "I’m anxious about something coming up." },
  { label: "Understand feelings.", text: "I want to understand my feelings better." },
  { label: "Ask questions.", text: "Ask me a few questions to help me reflect." },
  { label: "Write a journal entry.", text: "Help me write a journal entry about today." },
];

function makeWelcomeMessage(category: string) {
  const base =
    "Hi — I’m here with you. 💛\n\n" +
    "Before we begin:\n" +
    "• I’m not a therapist and I can’t diagnose.\n" +
    "• I *can* help you reflect, feel grounded, and take small next steps.\n\n";

  const questions =
    "A few gentle questions to start:\n" +
    "• How are you feeling right now — in your body and in your mind?\n" +
    "• What’s been taking up most of your energy lately?\n" +
    "• If today had a theme, what would it be?\n\n" +
    "You can type, or use the mic. What would you like to explore?";

  if (category === "Work") {
    return base + "We can talk about work stress, boundaries, focus, or confidence.\n\n" + questions;
  }
  if (category === "Relationships") {
    return base + "We can explore communication, conflict, closeness, or loneliness.\n\n" + questions;
  }
  if (category === "Stress") {
    return base + "We can slow down together and reduce the pressure a bit.\n\n" + questions;
  }

  return base + questions;
}

function safeTrim(s: any) {
  return typeof s === "string" ? s.trim() : "";
}

export default function AiCompanionPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // threads + messages
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // composer
  const [category, setCategory] = useState<Category>("General");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // actions
  const [threadActionId, setThreadActionId] = useState<string | null>(null);
  const [savingJournal, setSavingJournal] = useState(false);

  // UI
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showMobileThreads, setShowMobileThreads] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const welcomeMessage = useMemo(() => makeWelcomeMessage(category), [category]);

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load threads
  useEffect(() => {
    if (!user) return;

    async function loadThreads() {
      setLoadingThreads(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("ai_companion_threads")
          .select("id, title, category, created_at, updated_at, summary")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("[ai-companion] loadThreads error", error);
          setError("Failed to load conversations.");
          setThreads([]);
          return;
        }

        const rows = (data || []) as ThreadRow[];
        setThreads(rows);

        if (!activeThreadId && rows.length > 0) {
          setActiveThreadId(rows[0].id);
          if (rows[0].category && (CATEGORIES as readonly string[]).includes(rows[0].category)) {
            setCategory(rows[0].category as Category);
          }
        }
      } catch (e) {
        console.error("[ai-companion] loadThreads exception", e);
        setError("Failed to load conversations.");
      } finally {
        setLoadingThreads(false);
      }
    }

    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load messages for active thread
  useEffect(() => {
    if (!user || !activeThreadId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setLoadingMessages(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("ai_companion_messages")
          .select("id, role, content, created_at")
          .eq("thread_id", activeThreadId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(200);

        if (error) {
          console.error("[ai-companion] loadMessages error", error);
          setError("Failed to load messages.");
          setMessages([]);
          return;
        }

        setMessages((data || []) as MsgRow[]);
      } catch (e) {
        console.error("[ai-companion] loadMessages exception", e);
        setError("Failed to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [user, activeThreadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  function startNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setToast("");
    setError("");
  }

  async function ensureThreadIfNeeded(firstUserText: string) {
    if (!user) throw new Error("Not logged in");
    if (activeThreadId) return activeThreadId;

    const title = firstUserText.split("\n")[0].slice(0, 60).trim() || "New reflection";

    const { data, error } = await supabase
      .from("ai_companion_threads")
      .insert({
        user_id: user.id,
        title,
        category: category || null,
        updated_at: new Date().toISOString(),
      })
      .select("id, title, category, created_at, updated_at, summary")
      .single();

    if (error || !data) throw error || new Error("Failed to create conversation");

    const thread = data as ThreadRow;
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);

    return thread.id;
  }

  async function handleSend(e?: FormEvent, textOverride?: string) {
    if (e) e.preventDefault();
    if (!user) return;

    const text = safeTrim(textOverride ?? input);
    if (!text) return;

    setSending(true);
    setError("");
    setToast("");
    setInput("");

    const nowIso = new Date().toISOString();

    const localUser: MsgRow = {
      id: `local-u-${nowIso}`,
      role: "user",
      content: text,
      created_at: nowIso,
    };
    setMessages((prev) => [...prev, localUser]);

    try {
      const threadId = await ensureThreadIfNeeded(text);

      const historyForModel = messages.slice(-14).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai-companion-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          category,
          history: historyForModel,
          threadId,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "AI error");

      const assistantText = safeTrim(data.message) || "I’m here with you. Want to try again?";

      const chatSummary =
        typeof data.chat_summary === "string" && data.chat_summary.trim() ? data.chat_summary.trim() : null;

      const localAssistant: MsgRow = {
        id: `local-a-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, localAssistant]);

      const { error: msgErr } = await supabase.from("ai_companion_messages").insert([
        { thread_id: threadId, user_id: user.id, role: "user", content: text },
        { thread_id: threadId, user_id: user.id, role: "assistant", content: assistantText },
      ]);
      if (msgErr) console.error("[ai-companion] insert messages error", msgErr);

      const { error: updErr } = await supabase
        .from("ai_companion_threads")
        .update({
          updated_at: new Date().toISOString(),
          category,
          summary: chatSummary ?? undefined,
        })
        .eq("id", threadId)
        .eq("user_id", user.id);

      if (updErr) console.error("[ai-companion] update thread error", updErr);

      setThreads((prev) => {
        const existing = prev.find((t) => t.id === threadId);
        if (!existing) return prev;

        const updated: ThreadRow = {
          ...existing,
          updated_at: new Date().toISOString(),
          category,
          ...(chatSummary ? { summary: chatSummary } : {}),
        };

        return [updated, ...prev.filter((t) => t.id !== threadId)];
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        {
          id: `local-err-${Date.now()}`,
          role: "assistant",
          content: "I’m sorry — something went wrong on my side. Can you try again in a moment?",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleVoiceResult(payload: { rawText: string | null }) {
    const txt = safeTrim(payload.rawText);
    if (txt) handleSend(undefined, txt);
  }

  async function handleRenameThread(thread: ThreadRow) {
    if (!user) return;

    const currentTitle = thread.title || "Untitled";
    const newTitle = window.prompt("New title for this conversation:", currentTitle);
    if (!newTitle || newTitle.trim() === currentTitle.trim()) return;

    setThreadActionId(thread.id);
    setError("");
    try {
      const { data, error } = await supabase
        .from("ai_companion_threads")
        .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
        .eq("id", thread.id)
        .eq("user_id", user.id)
        .select("id, title, category, created_at, updated_at, summary")
        .single();

      if (error || !data) throw error || new Error("Rename failed");

      const updated = data as ThreadRow;
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? updated : t)));
    } catch (e) {
      console.error(e);
      alert("Failed to rename conversation.");
    } finally {
      setThreadActionId(null);
    }
  }

  async function handleDeleteThread(threadId: string) {
    if (!user) return;
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;

    setThreadActionId(threadId);
    setError("");
    try {
      const { error: msgErr } = await supabase
        .from("ai_companion_messages")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", user.id);
      if (msgErr) console.error("[ai-companion] delete messages error", msgErr);

      const { error: thErr } = await supabase
        .from("ai_companion_threads")
        .delete()
        .eq("id", threadId)
        .eq("user_id", user.id);

      if (thErr) throw thErr;

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete conversation.");
    } finally {
      setThreadActionId(null);
    }
  }

  async function saveAsJournalEntry() {
    if (!user) return;
    if (messages.length === 0) return;

    const active = threads.find((t) => t.id === activeThreadId);
    const title = (active?.title || "Journal entry").slice(0, 80);

    const lines: string[] = [];
    lines.push(`Category: ${active?.category || category}`);
    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("—");
    lines.push("");

    for (const m of messages) {
      const who = m.role === "user" ? "Me" : "Companion";
      lines.push(`${who}:`);
      lines.push(m.content);
      lines.push("");
    }

    const content = lines.join("\n").trim();
    if (!content) return;

    setSavingJournal(true);
    setError("");
    setToast("");

    try {
      const { error } = await supabase.from("notes").insert([
        {
          user_id: user.id,
          title,
          content,
          category: "Journal",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setToast("Saved as journal entry ✅");
    } catch (e) {
      console.error(e);
      setError("Couldn’t save journal entry. Please try again.");
    } finally {
      setSavingJournal(false);
    }
  }

  function openThread(thread: ThreadRow) {
    setActiveThreadId(thread.id);
    setToast("");
    setError("");
    if (thread.category && (CATEGORIES as readonly string[]).includes(thread.category)) {
      setCategory(thread.category as Category);
    }
    setShowMobileThreads(false);
  }

  const activeThread = useMemo(() => threads.find((t) => t.id === activeThreadId) || null, [threads, activeThreadId]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="ai-companion" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">AI Companion</h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            Log in to use the AI Companion and keep your reflections saved.
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

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="ai-companion" />

      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 min-w-0">
          <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">Conversations</p>
              <p className="text-[10px] text-[var(--text-muted)]">A private space to reflect and revisit.</p>
            </div>

            <button
              type="button"
              onClick={startNewChat}
              className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
            >
              + New
            </button>
          </div>

          <div className="p-3 border-b border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] mb-1">Category (for new messages)</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2 py-1 text-[11px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
            {loadingThreads ? (
              <p className="p-3 text-[var(--text-muted)] text-[11px]">Loading conversations…</p>
            ) : threads.length === 0 ? (
              <p className="p-3 text-[var(--text-muted)] text-[11px]">No conversations yet. Start a new chat and talk it out.</p>
            ) : (
              threads.map((t) => {
                const isActive = activeThreadId === t.id;
                const isBusy = threadActionId === t.id;

                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer min-w-0 ${
                      isActive ? "bg-[var(--bg-card)]" : "hover:bg-[var(--bg-elevated)]"
                    }`}
                    onClick={() => openThread(t)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-[12px]">{t.title || "New reflection"}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{t.category || "General"}</p>
                      {t.summary ? (
                        <p className="text-[10px] text-[var(--text-muted)] truncate opacity-80">{t.summary}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRenameThread(t)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[11px]"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteThread(t.id)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[11px] text-red-400"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main chat */}
        <section className="flex-1 flex flex-col relative min-w-0 w-full">
          <div className="px-3 sm:px-4 py-3 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-semibold">AI Companion</h1>
              <p className="text-[11px] text-[var(--text-muted)]">A gentle space to reflect, feel grounded, and write it out.</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Not a therapist. No diagnosis. If you’re in danger or crisis, contact local emergency services.
              </p>

              {activeThread?.title && (
                <p className="mt-2 text-[11px] text-[var(--text-muted)] min-w-0">
                  <span className="truncate inline-block max-w-full align-bottom">
                    Conversation: <span className="text-[var(--text-main)] font-semibold">{activeThread.title}</span>
                  </span>
                  {activeThread.category ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px]">
                      {activeThread.category}
                    </span>
                  ) : null}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMobileThreads(true)}
                className="md:hidden text-[11px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"
              >
                History
              </button>

              <button
                type="button"
                onClick={saveAsJournalEntry}
                disabled={savingJournal || messages.length === 0}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] disabled:opacity-60"
              >
                {savingJournal ? "Saving…" : "Save as journal"}
              </button>

              <button
                type="button"
                onClick={startNewChat}
                className="text-[11px] px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
              >
                + New chat
              </button>
            </div>
          </div>

          {error && <p className="px-3 sm:px-4 pt-2 text-[11px] text-red-400">{error}</p>}
          {toast && <p className="px-3 sm:px-4 pt-2 text-[11px] text-emerald-400">{toast}</p>}

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 space-y-3 text-sm min-w-0">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="w-full max-w-[760px] rounded-2xl px-3 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] whitespace-pre-wrap text-[13px]">
                  {welcomeMessage}
                </div>

                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSend(undefined, p.text)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMessages && messages.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">Loading conversation…</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} min-w-0`}>
                  <div
                    className={`w-fit max-w-[92%] sm:max-w-[82%] rounded-2xl px-3 py-2 text-[13px] whitespace-pre-wrap break-words ${
                      m.role === "user"
                        ? "bg-[var(--accent)] text-[var(--bg-body)] rounded-br-sm"
                        : "bg-[var(--bg-card)] text-[var(--text-main)] rounded-bl-sm border border-[var(--border-subtle)]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start min-w-0">
                <div className="w-fit max-w-[92%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-[13px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ✅ Composer (fixed mic layout: compact button, never overlaps textarea) */}
          <form
            onSubmit={(e) => handleSend(e)}
            className="border-t border-[var(--border-subtle)] px-3 sm:px-4 py-2 flex flex-col gap-2 min-w-0"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)] min-w-0">
              <span className="hidden md:inline">Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px] max-w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-[var(--text-muted)]">Helps the companion adapt tone & questions.</span>
            </div>

            <div className="flex items-end gap-2 min-w-0">
              <div className="shrink-0">
                {/* IMPORTANT: requires VoiceCaptureButton to support variant="compact" */}
                <VoiceCaptureButton userId={user.id} mode="review" onResult={handleVoiceResult} variant="compact" />
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type here… or use the mic."
                className="flex-1 min-w-0 w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-main)] min-h-[48px] max-h-[140px] resize-y"
              />

              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="shrink-0 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-[13px]"
              >
                Send
              </button>
            </div>
          </form>

          {/* Mobile history drawer */}
          {showMobileThreads && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileThreads(false)} />
              <div className="absolute inset-y-0 left-0 w-[90%] max-w-xs bg-[var(--bg-body)] border-r border-[var(--border-subtle)] flex flex-col">
                <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Conversation history</p>
                  <button
                    type="button"
                    onClick={() => setShowMobileThreads(false)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="p-3 border-b border-[var(--border-subtle)]">
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">Category (for new messages)</p>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2 py-1 text-[11px]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
                  {loadingThreads ? (
                    <p className="p-3 text-[var(--text-muted)] text-[11px]">Loading conversations…</p>
                  ) : threads.length === 0 ? (
                    <p className="p-3 text-[var(--text-muted)] text-[11px]">No conversations yet. Start a new chat.</p>
                  ) : (
                    threads.map((t) => {
                      const isActive = activeThreadId === t.id;
                      const isBusy = threadActionId === t.id;

                      return (
                        <div
                          key={t.id}
                          className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer ${
                            isActive ? "bg-[var(--bg-card)]" : "hover:bg-[var(--bg-elevated)]"
                          }`}
                          onClick={() => openThread(t)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-[12px]">{t.title || "New reflection"}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{t.category || "General"}</p>
                            {t.summary ? (
                              <p className="text-[10px] text-[var(--text-muted)] truncate opacity-80">{t.summary}</p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleRenameThread(t)}
                              disabled={isBusy}
                              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[11px]"
                              title="Rename"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteThread(t.id)}
                              disabled={isBusy}
                              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[11px] text-red-400"
                              title="Delete"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => {
                      startNewChat();
                      setShowMobileThreads(false);
                    }}
                    className="w-full text-[11px] px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90"
                  >
                    + New chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
