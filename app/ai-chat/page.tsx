// app/ai-chat/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type ThreadRow = {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const CATEGORIES = [
  "General",
  "Planning",
  "Work",
  "Study",
  "Mindset",
  "Health",
  "Ideas",
];

export default function AIChatPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [category, setCategory] = useState<string>("General");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [threadActionId, setThreadActionId] = useState<string | null>(null);

  // 1) Load user
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

  // 2) Load threads
  useEffect(() => {
    if (!user) return;
    async function loadThreads() {
      setLoadingThreads(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("ai_chat_threads")
          .select("id, title, category, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("[ai-chat] loadThreads error", error);
          setError("Failed to load conversations.");
          setThreads([]);
          return;
        }
        setThreads((data || []) as ThreadRow[]);

        if (!activeThreadId && data && data.length > 0) {
          setActiveThreadId(data[0].id);
        }
      } catch (err) {
        console.error("[ai-chat] loadThreads exception", err);
        setError("Failed to load conversations.");
      } finally {
        setLoadingThreads(false);
      }
    }
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3) Load messages for active thread
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
          .from("ai_chat_messages")
          .select("id, role, content, created_at")
          .eq("thread_id", activeThreadId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("[ai-chat] loadMessages error", error);
          setError("Failed to load messages.");
          setMessages([]);
          return;
        }

        setMessages((data || []) as ChatMessage[]);
      } catch (err) {
        console.error("[ai-chat] loadMessages exception", err);
        setError("Failed to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [user, activeThreadId]);

  // 4) Send message
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to chat with AI.");
      return;
    }
    const text = input.trim();
    if (!text) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/ai-hub-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId,
          userId: user.id, // extra, but harmless if API ignores it
          category,
          userMessage: text,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        console.error("[ai-chat] send error payload", data);
        setError(data?.error || "Failed to send message.");
        setSending(false);
        return;
      }

      const threadId = data.threadId as string;
      const assistantMessage = data.assistantMessage as string;

      // If it was a new thread, refresh sidebar
      if (!activeThreadId || activeThreadId !== threadId) {
        setActiveThreadId(threadId);

        const { data: tData, error: tErr } = await supabase
          .from("ai_chat_threads")
          .select("id, title, category, created_at, updated_at")
          .eq("id", threadId)
          .maybeSingle();

        if (!tErr && tData) {
          setThreads((prev) => {
            const filtered = prev.filter((t) => t.id !== threadId);
            return [tData as ThreadRow, ...filtered];
          });
        }
      } else {
        // Move existing thread to top
        setThreads((prev) => {
          const found = prev.find((t) => t.id === threadId);
          if (!found) return prev;
          const others = prev.filter((t) => t.id !== threadId);
          return [
            { ...found, updated_at: new Date().toISOString() },
            ...others,
          ];
        });
      }

      // Update local messages instantly (optimistic)
      const nowIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: `local-user-${nowIso}`,
          role: "user",
          content: text,
          created_at: nowIso,
        },
        {
          id: `local-assistant-${nowIso}`,
          role: "assistant",
          content: assistantMessage,
          created_at: nowIso,
        },
      ]);

      setInput("");
    } catch (err) {
      console.error("[ai-chat] send exception", err);
      setError("Network error while sending message.");
    } finally {
      setSending(false);
    }
  }

  // 5) Delete thread
  async function handleDeleteThread(threadId: string) {
  if (!threadId) return;
  if (!user) return;
  if (!window.confirm("Delete this chat? This cannot be undone.")) return;

  setThreadActionId(threadId);

  try {
    const res = await fetch("/api/ai-hub-chat/thread", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, userId: user.id }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || !data?.ok) {
      console.error("[ai-chat] delete thread error", data);
      alert(data?.error || "Failed to delete chat.");
      return;
    }

    setThreads((prev) => prev.filter((t) => t.id !== threadId));

    setActiveThreadId((current) =>
      current === threadId ? null : current
    );
    setMessages((prev) => (activeThreadId === threadId ? [] : prev));
  } catch (err) {
    console.error("[ai-chat] delete thread exception", err);
    alert("Failed to delete chat due to a network error.");
  } finally {
    setThreadActionId(null);
  }
}

  // 6) Rename thread
  async function handleRenameThread(thread: ThreadRow) {
  const currentTitle = thread.title || "Untitled chat";
  const newTitle = window.prompt("New title for this chat:", currentTitle);

  if (!newTitle || newTitle.trim() === currentTitle.trim()) {
    return;
  }

  setThreadActionId(thread.id);

  try {
    const res = await fetch("/api/ai-hub-chat/rename-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: thread.id,
        title: newTitle,
        userId: user.id,
      }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || !data?.ok) {
      console.error("[ai-chat] rename thread error", data);
      alert(data?.error || "Failed to rename chat.");
      return;
    }

    const updated = data.thread as ThreadRow;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, title: updated.title } : t
      )
    );
  } catch (err) {
    console.error("[ai-chat] rename thread exception", err);
    alert("Failed to rename chat due to a network error.");
  } finally {
    setThreadActionId(null);
  }
}

function startNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setCategory("General");
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
        <AppHeader active="explore" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">AI Hub Chat</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to chat with your AI coach and keep
            your conversations saved.
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="explore" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: threads */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/80">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-200">
              Conversations
            </p>
            <button
              type="button"
              onClick={startNewChat}
              className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800"
            >
              + New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
            {loadingThreads ? (
              <p className="p-2 text-slate-400 text-[11px]">
                Loading conversations…
              </p>
            ) : threads.length === 0 ? (
              <p className="p-2 text-slate-500 text-[11px]">
                No conversations yet. Start a new chat on the right.
              </p>
            ) : (
              threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isBusy = threadActionId === thread.id;

                return (
                  <div
                    key={thread.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                      isActive
                        ? "bg-slate-800 text-slate-50"
                        : "hover:bg-slate-800/60 text-slate-200"
                    }`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {thread.title || "New conversation"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {thread.category || "General"}
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleRenameThread(thread)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-slate-700 text-[11px]"
                        title="Rename chat"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteThread(thread.id)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-slate-700 text-[11px] text-red-400"
                        title="Delete chat"
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

        {/* Main chat area */}
        <section className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base md:text-lg font-semibold">
                AI Hub Chat
              </h1>
              <p className="text-[11px] text-slate-400">
                A general-purpose AI coach for planning, ideas and questions.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="md:hidden text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800"
            >
              + New chat
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="px-4 pt-2 text-[11px] text-red-400">{error}</p>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {loadingMessages && messages.length === 0 ? (
              <p className="text-[12px] text-slate-400">
                Loading conversation…
              </p>
            ) : messages.length === 0 ? (
              <div className="text-[12px] text-slate-400 mt-4">
                <p className="mb-1">Start by asking something like:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>“Help me plan my week around work and personal goals.”</li>
                  <li>“Turn my todo list into 3 clear priorities.”</li>
                  <li>“I feel overwhelmed — where should I start today?”</li>
                </ul>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-slate-900 text-slate-100 rounded-bl-sm border border-slate-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-800 px-3 py-2 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="hidden md:inline">Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-[11px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500">
                Helps the AI adapt tone & suggestions.
              </span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything — planning, focus, ideas, mindset…"
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-[13px] text-slate-100 min-h-[48px] max-h-[120px] resize-y"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-[13px]"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
