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

// ✅ Same limits as notes dashboard
const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 50;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

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

  // 👇 NEW: plan & AI usage
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [aiCountToday, setAiCountToday] = useState(0);

  // 👇 NEW: mobile threads drawer toggle
  const [showMobileThreads, setShowMobileThreads] = useState(false);

  const dailyLimit = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(dailyLimit - aiCountToday, 0);

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

  // 2) Load plan & AI usage when user changes
  useEffect(() => {
    if (!user) {
      setPlan("free");
      setAiCountToday(0);
      return;
    }

    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("[ai-chat] loadPlan error", error);
          return;
        }

        if (data?.plan === "pro") {
          setPlan("pro");
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error("[ai-chat] loadPlan exception", err);
      }
    }

    async function loadAiUsage() {
      try {
        const today = getTodayString();
        const { data, error } = await supabase
          .from("ai_usage")
          .select("count")
          .eq("user_id", user.id)
          .eq("usage_date", today)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("[ai-chat] loadAiUsage error", error);
          return;
        }

        setAiCountToday(data?.count || 0);
      } catch (err) {
        console.error("[ai-chat] loadAiUsage exception", err);
      }
    }

    loadPlan();
    loadAiUsage();
  }, [user]);

  // Helper: increment ai_usage count
  async function incrementAiUsage() {
    if (!user) return;

    const today = getTodayString();

    try {
      const { data, error } = await supabase
        .from("ai_usage")
        .select("id, count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("[ai-chat] incrementAiUsage select error", error);
        return;
      }

      if (!data) {
        const { error: insertError } = await supabase.from("ai_usage").insert([
          {
            user_id: user.id,
            usage_date: today,
            count: 1,
          },
        ]);

        if (insertError) {
          console.error("[ai-chat] incrementAiUsage insert error", insertError);
          return;
        }

        setAiCountToday(1);
      } else {
        const newCount = (data.count || 0) + 1;
        const { error: updateError } = await supabase
          .from("ai_usage")
          .update({ count: newCount })
          .eq("id", data.id);

        if (updateError) {
          console.error("[ai-chat] incrementAiUsage update error", updateError);
          return;
        }

        setAiCountToday(newCount);
      }
    } catch (err) {
      console.error("[ai-chat] incrementAiUsage exception", err);
    }
  }

  // 3) Load threads
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

  // 4) Load messages for active thread
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

  // 5) Send message (AI call + DB writes on client)
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to chat with AI.");
      return;
    }

    const text = input.trim();
    if (!text) return;

    // ✅ Enforce daily limit
    if (remaining <= 0) {
      setError(
        `You reached your daily AI limit for the ${plan} plan (${dailyLimit} replies).`
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      // Build history for AI from existing messages
      const historyForModel = messages.slice(-15).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai-hub-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          category,
          history: historyForModel,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        console.error("[ai-chat] send error payload", data);
        setError(data?.error || "Failed to send message.");
        setSending(false);
        return;
      }

      const assistantMessage = data.assistantMessage as string;
      const titleFromServer = (data.title as string | null) || null;

      const nowIso = new Date().toISOString();

      // Optimistic UI
      const localUserMsg: ChatMessage = {
        id: `local-user-${nowIso}`,
        role: "user",
        content: text,
        created_at: nowIso,
      };
      const localAssistantMsg: ChatMessage = {
        id: `local-assistant-${nowIso}`,
        role: "assistant",
        content: assistantMessage,
        created_at: nowIso,
      };

      setMessages((prev) => [...prev, localUserMsg, localAssistantMsg]);
      setInput("");

      // DB writes
      if (!activeThreadId) {
        // New conversation: create thread + messages
        const fallbackTitle =
          titleFromServer ||
          text.split("\n")[0].slice(0, 80).trim() ||
          "New conversation";

        const { data: threadData, error: threadError } = await supabase
          .from("ai_chat_threads")
          .insert({
            user_id: user.id,
            title: fallbackTitle,
            category: category || null,
          })
          .select("id, title, category, created_at, updated_at")
          .single();

        if (threadError || !threadData) {
          console.error("[ai-chat] create thread error", threadError);
          setError(
            "Failed to save conversation, but you can continue chatting."
          );
          return;
        }

        const newThread = threadData as ThreadRow;
        setActiveThreadId(newThread.id);
        setThreads((prev) => [newThread, ...prev]);

        const { error: msgErr } = await supabase
          .from("ai_chat_messages")
          .insert([
            {
              thread_id: newThread.id,
              user_id: user.id,
              role: "user",
              content: text,
            },
            {
              thread_id: newThread.id,
              user_id: user.id,
              role: "assistant",
              content: assistantMessage,
            },
          ]);

        if (msgErr) {
          console.error("[ai-chat] insert messages error", msgErr);
        }
      } else {
        // Existing conversation: append messages + bump updated_at
        const threadId = activeThreadId;

        const { error: msgErr } = await supabase
          .from("ai_chat_messages")
          .insert([
            {
              thread_id: threadId,
              user_id: user.id,
              role: "user",
              content: text,
            },
            {
              thread_id: threadId,
              user_id: user.id,
              role: "assistant",
              content: assistantMessage,
            },
          ]);

        if (msgErr) {
          console.error("[ai-chat] insert messages error", msgErr);
        }

        const { error: threadErr } = await supabase
          .from("ai_chat_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", threadId)
          .eq("user_id", user.id);

        if (threadErr) {
          console.error("[ai-chat] update thread timestamp error", threadErr);
        }

        // Move updated thread to top of sidebar
        setThreads((prev) => {
          const updated = prev.find((t) => t.id === threadId);
          if (!updated) return prev;
          const rest = prev.filter((t) => t.id !== threadId);
          return [updated, ...rest];
        });
      }

      // ✅ Count this AI usage
      await incrementAiUsage();
    } catch (err) {
      console.error("[ai-chat] send exception", err);
      setError("Network error while sending message.");
    } finally {
      setSending(false);
    }
  }

  // 6) Delete thread (direct via Supabase)
  async function handleDeleteThread(threadId: string) {
    if (!user) return;
    if (!threadId) return;
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;

    setThreadActionId(threadId);
    setError("");

    try {
      const { error: msgErr } = await supabase
        .from("ai_chat_messages")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", user.id);

      if (msgErr) {
        console.error("[ai-chat] delete messages error", msgErr);
      }

      const { error: threadErr } = await supabase
        .from("ai_chat_threads")
        .delete()
        .eq("id", threadId)
        .eq("user_id", user.id);

      if (threadErr) {
        console.error("[ai-chat] delete thread error", threadErr);
        alert("Failed to delete chat.");
        return;
      }

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      setActiveThreadId((current) =>
        current === threadId ? null : current
      );
      setMessages((prev) =>
        activeThreadId === threadId ? [] : prev
      );
    } catch (err) {
      console.error("[ai-chat] delete thread exception", err);
      alert("Failed to delete chat due to a network error.");
    } finally {
      setThreadActionId(null);
    }
  }

  // 7) Rename thread (client-side via Supabase)
  async function handleRenameThread(thread: ThreadRow) {
    if (!user) return;

    const currentTitle = thread.title || "Untitled chat";
    const newTitle = window.prompt("New title for this chat:", currentTitle);

    if (!newTitle || newTitle.trim() === currentTitle.trim()) {
      return;
    }

    setThreadActionId(thread.id);
    setError("");

    try {
      const { data, error } = await supabase
        .from("ai_chat_threads")
        .update({
          title: newTitle.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", thread.id)
        .eq("user_id", user.id)
        .select("id, title, category, created_at, updated_at")
        .maybeSingle();

      if (error) {
        console.error("[ai-chat] rename thread error", error);
        alert("Failed to rename chat.");
        return;
      }

      if (!data) {
        alert("Chat not found or not accessible.");
        return;
      }

      const updated = data as ThreadRow;

      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? updated : t))
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
        {/* Sidebar: threads (desktop) */}
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
              <p className="p-3 text-slate-400 text-[11px]">
                Loading conversations…
              </p>
            ) : threads.length === 0 ? (
              <p className="p-3 text-slate-500 text-[11px]">
                No conversations yet. Start a new chat on the right.
              </p>
            ) : (
              threads.map((thread) => {
                const isActive = activeThreadId === thread.id;
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
        <section className="flex-1 flex flex-col relative">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base md:text-lg font-semibold">
                AI Hub Chat
              </h1>
              <p className="text-[11px] text-slate-400">
                A general-purpose AI coach for planning, ideas and questions.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {/* Usage indicator */}
              <span className="text-[10px] text-slate-400">
                AI replies today:{" "}
                <span className="font-semibold text-slate-200">
                  {aiCountToday}/{dailyLimit}
                </span>{" "}
                ({plan})
              </span>

              <div className="flex items-center gap-2">
                {/* Mobile: history button */}
                <button
                  type="button"
                  onClick={() => setShowMobileThreads(true)}
                  className="md:hidden text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800"
                >
                  History
                </button>

                {/* Mobile: new chat */}
                <button
                  type="button"
                  onClick={startNewChat}
                  className="md:hidden text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800"
                >
                  + New chat
                </button>
              </div>
            </div>
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
                  <li>
                    “Help me plan my week around work and personal goals.”
                  </li>
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
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
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
                disabled={sending || !input.trim() || remaining <= 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-[13px]"
              >
                {sending
                  ? "Sending…"
                  : remaining <= 0
                  ? "Limit reached"
                  : "Send"}
              </button>
            </div>
          </form>

          {/* Mobile history drawer */}
          {showMobileThreads && (
            <div className="fixed inset-0 z-50 md:hidden">
              {/* backdrop */}
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowMobileThreads(false)}
              />
              {/* panel */}
              <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-slate-950 border-r border-slate-800 flex flex-col">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-200">
                    Conversation history
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMobileThreads(false)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
                  {loadingThreads ? (
                    <p className="p-3 text-slate-400 text-[11px]">
                      Loading conversations…
                    </p>
                  ) : threads.length === 0 ? (
                    <p className="p-3 text-slate-500 text-[11px]">
                      No conversations yet. Start a new chat.
                    </p>
                  ) : (
                    threads.map((thread) => {
                      const isActive = activeThreadId === thread.id;
                      const isBusy = threadActionId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                            isActive
                              ? "bg-slate-800 text-slate-50"
                              : "hover:bg-slate-800/60 text-slate-200"
                          }`}
                          onClick={() => {
                            setActiveThreadId(thread.id);
                            setShowMobileThreads(false);
                          }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
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
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
