// app/ai-chat/page.tsx
"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

// ✅ Auth gate (modal + requireAuth)
import AuthGateModal from "@/app/components/AuthGateModal";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";

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

const CATEGORIES = ["General", "Planning", "Work", "Study", "Mindset", "Health", "Ideas"] as const;

// ✅ Same limits as dashboard
const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export default function AIChatPage() {
  // ✅ Notes-style: always build full keys aiChat.*
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`aiChat.${key}`, fallback);

  // ✅ Your keys are: aiChat.category.general, aiChat.category.planning, etc
  const categoryLabel = (c: string) => {
    const lc = String(c || "").toLowerCase();
    return t(`category.${lc}`, c || t("category.general", "General"));
  };

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // ✅ Auth gate hook
  const { open: authOpen, authHref, copy: authCopy, close: closeAuth, requireAuth } = useAuthGate(user);

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

  // Pro Features State
  const [attachments, setAttachments] = useState<{ name: string; content: string }[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plan & AI usage
  const [plan, setPlan] = useState<"free" | "pro" | "founder">("free");
  const [aiCountToday, setAiCountToday] = useState(0);

  // Mobile threads drawer toggle
  const [showMobileThreads, setShowMobileThreads] = useState(false);

  const isPro = plan === "pro" || plan === "founder";
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = isPro ? Infinity : Math.max(dailyLimit - aiCountToday, 0);

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
        const { data, error } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("[ai-chat] loadPlan error", error);
          return;
        }

        if (data?.plan === "founder") setPlan("founder");
        else if (data?.plan === "pro") setPlan("pro");
        else setPlan("free");
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

        if (error && (error as any).code !== "PGRST116") {
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
          setError(t("errors.loadThreads", "Failed to load conversations."));
          setThreads([]);
          return;
        }

        setThreads((data || []) as ThreadRow[]);

        if (!activeThreadId && data && data.length > 0) {
          setActiveThreadId(data[0].id);
        }
      } catch (err) {
        console.error("[ai-chat] loadThreads exception", err);
        setError(t("errors.loadThreads", "Failed to load conversations."));
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
          setError(t("errors.loadMessages", "Failed to load messages."));
          setMessages([]);
          return;
        }

        setMessages((data || []) as ChatMessage[]);
      } catch (err) {
        console.error("[ai-chat] loadMessages exception", err);
        setError(t("errors.loadMessages", "Failed to load messages."));
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeThreadId]);

  function startNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setCategory("General");
  }
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isPro) {
      // Just clear, UI should show lock but safeguards here
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setAttachments(prev => [...prev, { name: file.name, content }]);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleVoiceResult({ rawText }: { rawText: string | null }) {
    if (!rawText) return;
    setInput((prev) => (prev ? `${prev} ${rawText}` : rawText));
  }

  async function handleGenerateImage() {
    if (!isPro) return;
    if (!imagePrompt.trim()) return;

    setShowImageModal(false);
    setSending(true);

    const nowIso = new Date().toISOString();
    const localUser: ChatMessage = {
      id: `local-u-img-${nowIso}`,
      role: "user",
      content: `${t("image.request", "Generate image:")} ${imagePrompt}`,
      created_at: nowIso,
    };
    setMessages(prev => [...prev, localUser]);

    try {
      // Reuse same thread or new one (handled by ai-hub-chat route?) 
      // Actually images route is separate. Let's call ai-images directly like companion.

      const res = await fetch("/api/ai-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, prompt: imagePrompt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");

      const imageUrl = data.imageUrl;
      const assistantMsg: ChatMessage = {
        id: `local-a-img-${Date.now()}`,
        role: "assistant",
        content: `![Generated Image](${imageUrl})`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save to DB (optional, but good for history)
      if (activeThreadId) {
        await supabase.from("ai_chat_messages").insert([
          { thread_id: activeThreadId, user_id: user.id, role: "user", content: localUser.content },
          { thread_id: activeThreadId, user_id: user.id, role: "assistant", content: assistantMsg.content }
        ]);
      }
      // If no thread, maybe we should create one? 
      // For simplicity in V1 image generation, if no thread exists, we don't save or we create one.
      // Let's create one if needed using the prompt.
      else {
        // ... (thread creation logic duplication is verbose, maybe skip saving for no-thread image gen for now or just let it exist in memory)
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate image");
    } finally {
      setSending(false);
      setImagePrompt("");
    }
  }

  // 5) Send message (auth-gated)
  async function handleSend(e: FormEvent) {
    e.preventDefault();

    if (
      !requireAuth(undefined, {
        title: "Log in to chat",
        subtitle: "Create a free account to message the AI and save your conversation history.",
      })
    ) {
      return;
    }

    if (!user) return;

    const text = input.trim();
    if (!text) return;

    if (!isPro && remaining <= 0) {
      setError(t("errors.freeLimitReached", `You reached your daily AI limit for the free plan (${FREE_DAILY_LIMIT} replies).`));
      return;
    }

    setSending(true);
    setError("");

    try {
      const historyForModel = messages.slice(-15).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai-hub-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id, // ✅ IMPORTANT: server increments ai_usage
          userMessage: text,
          category,
          history: historyForModel,
          attachments, // ✅ PRO Feature
        }),
      });

      setAttachments([]); // clear attachments

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        console.error("[ai-chat] send error payload", data);
        setError(data?.error || t("errors.sendFailed", "Failed to send message."));
        setSending(false);
        return;
      }

      const assistantMessage = String(data.assistantMessage || "");
      const titleFromServer = (data.title as string | null) || null;

      // ✅ Update today's count immediately from server response (no client-side increment)
      if (typeof data.aiCountToday === "number") {
        setAiCountToday(data.aiCountToday);
      }

      const nowIso = new Date().toISOString();

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

      if (!activeThreadId) {
        const fallbackTitle =
          titleFromServer || text.split("\n")[0].slice(0, 80).trim() || t("newConversationFallback", "New conversation");

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
          setError(t("errors.saveThread", "Failed to save conversation, but you can continue chatting."));
          return;
        }

        const newThread = threadData as ThreadRow;
        setActiveThreadId(newThread.id);
        setThreads((prev) => [newThread, ...prev]);

        const { error: msgErr } = await supabase.from("ai_chat_messages").insert([
          { thread_id: newThread.id, user_id: user.id, role: "user", content: text },
          { thread_id: newThread.id, user_id: user.id, role: "assistant", content: assistantMessage },
        ]);

        if (msgErr) console.error("[ai-chat] insert messages error", msgErr);
      } else {
        const threadId = activeThreadId;

        const { error: msgErr } = await supabase.from("ai_chat_messages").insert([
          { thread_id: threadId, user_id: user.id, role: "user", content: text },
          { thread_id: threadId, user_id: user.id, role: "assistant", content: assistantMessage },
        ]);

        if (msgErr) console.error("[ai-chat] insert messages error", msgErr);

        const { error: threadErr } = await supabase
          .from("ai_chat_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", threadId)
          .eq("user_id", user.id);

        if (threadErr) console.error("[ai-chat] update thread timestamp error", threadErr);

        setThreads((prev) => {
          const existing = prev.find((tRow) => tRow.id === threadId);
          if (!existing) return prev;

          const updated: ThreadRow = { ...existing, updated_at: new Date().toISOString() };
          const rest = prev.filter((tRow) => tRow.id !== threadId);
          return [updated, ...rest];
        });
      }
    } catch (err) {
      console.error("[ai-chat] send exception", err);
      setError(t("errors.networkSend", "Network error while sending message."));
    } finally {
      setSending(false);
    }
  }

  // 6) Delete thread (auth-gated)
  async function handleDeleteThread(threadId: string) {
    if (
      !requireAuth(undefined, {
        title: "Log in to manage chats",
        subtitle: "Create an account to delete conversations and keep your history synced.",
      })
    ) {
      return;
    }

    if (!threadId) return;
    if (!window.confirm(t("confirm.deleteThread", "Delete this chat? This cannot be undone."))) return;

    setThreadActionId(threadId);
    setError("");

    try {
      const { error: msgErr } = await supabase.from("ai_chat_messages").delete().eq("thread_id", threadId).eq("user_id", user.id);
      if (msgErr) console.error("[ai-chat] delete messages error", msgErr);

      const { error: threadErr } = await supabase.from("ai_chat_threads").delete().eq("id", threadId).eq("user_id", user.id);

      if (threadErr) {
        console.error("[ai-chat] delete thread error", threadErr);
        alert(t("errors.deleteFailed", "Failed to delete chat."));
        return;
      }

      setThreads((prev) => prev.filter((tRow) => tRow.id !== threadId));
      setActiveThreadId((current) => (current === threadId ? null : current));
      setMessages((prev) => (activeThreadId === threadId ? [] : prev));
    } catch (err) {
      console.error("[ai-chat] delete thread exception", err);
      alert(t("errors.deleteNetwork", "Failed to delete chat due to a network error."));
    } finally {
      setThreadActionId(null);
    }
  }

  // 7) Rename thread (auth-gated)
  async function handleRenameThread(thread: ThreadRow) {
    if (
      !requireAuth(undefined, {
        title: "Log in to manage chats",
        subtitle: "Create an account to rename conversations and keep your history synced.",
      })
    ) {
      return;
    }

    const currentTitle = thread.title || t("untitledChat", "Untitled chat");
    const newTitle = window.prompt(t("prompt.renameTitle", "New title for this chat:"), currentTitle);

    if (!newTitle || newTitle.trim() === currentTitle.trim()) return;

    setThreadActionId(thread.id);
    setError("");

    try {
      const { data, error } = await supabase
        .from("ai_chat_threads")
        .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
        .eq("id", thread.id)
        .eq("user_id", user.id)
        .select("id, title, category, created_at, updated_at")
        .maybeSingle();

      if (error) {
        console.error("[ai-chat] rename thread error", error);
        alert(t("errors.renameFailed", "Failed to rename chat."));
        return;
      }

      if (!data) {
        alert(t("errors.renameNotFound", "Chat not found or not accessible."));
        return;
      }

      const updated = data as ThreadRow;
      setThreads((prev) => prev.map((tRow) => (tRow.id === thread.id ? updated : tRow)));
    } catch (err) {
      console.error("[ai-chat] rename thread exception", err);
      alert(t("errors.renameNetwork", "Failed to rename chat due to a network error."));
    } finally {
      setThreadActionId(null);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">{t("status.checkingSession", "Checking your session…")}</p>
      </main>
    );
  }

  const canInteract = !!user;

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="ai-chat" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: threads (desktop) */}
        <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70">
          <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">{t("conversations", "Conversations")}</p>
            <button
              type="button"
              onClick={() => {
                if (!requireAuth(() => startNewChat(), { title: "Log in to start chats", subtitle: "Create an account to start and save conversations." })) return;
              }}
              className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
            >
              {t("newChat", "+ New chat")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
            {!user ? (
              <div className="p-3 text-[11px] text-[var(--text-muted)]">
                <p className="font-semibold text-[var(--text-main)] mb-1">{t("visitor.title", "Browsing mode")}</p>
                <p className="mb-2">{t("visitor.body", "Log in to see your saved chat history and continue conversations.")}</p>
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(undefined, {
                      title: "Log in to view history",
                      subtitle: "Create a free account to save and load your chat conversations.",
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-[11px]"
                >
                  {t("visitor.cta", "Log in / Sign up")}
                </button>
              </div>
            ) : loadingThreads ? (
              <p className="p-3 text-[var(--text-muted)] text-[11px]">{t("sidebar.loading", "Loading conversations…")}</p>
            ) : threads.length === 0 ? (
              <p className="p-3 text-[var(--text-muted)] text-[11px]">{t("sidebar.empty", "No conversations yet. Start a new chat on the right.")}</p>
            ) : (
              threads.map((thread) => {
                const isActive = activeThreadId === thread.id;
                const isBusy = threadActionId === thread.id;

                return (
                  <div
                    key={thread.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${isActive ? "bg-[var(--bg-card)] text-[var(--text-main)]" : "hover:bg-[var(--bg-elevated)] text-[var(--text-main)]"
                      }`}
                    onClick={() => {
                      if (!requireAuth()) return;
                      setActiveThreadId(thread.id);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{thread.title || t("sampleTitle", "New conversation")}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{categoryLabel(thread.category || "General")}</p>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRenameThread(thread)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-[var(--bg-card)] text-[11px]"
                        title={t("edit", "Edit")}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteThread(thread.id)}
                        disabled={isBusy}
                        className="p-1 rounded hover:bg-[var(--bg-card)] text-[11px] text-red-400"
                        title={t("delete", "Delete")}
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
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base md:text-lg font-semibold">{t("title", "AI Hub Chat")}</h1>
              <p className="text-[11px] text-[var(--text-muted)]">{t("subtitle", "A general-purpose AI coach for planning, ideas and questions.")}</p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {canInteract ? (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {t("usage.hintHeaderOnly", "AI usage is shown in the header.")}
                </span>
              ) : (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {t("visitor.usageHint", "Log in to start chatting and save your conversations.")}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!requireAuth(() => setShowMobileThreads(true), { title: "Log in to view history", subtitle: "Create an account to access your saved conversations." })) return;
                  }}
                  className="md:hidden text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                >
                  {t("mobile.historyButton", "History")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!requireAuth(() => startNewChat(), { title: "Log in to start chats", subtitle: "Create an account to start and save conversations." })) return;
                  }}
                  className="md:hidden text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                >
                  {t("newChat", "+ New chat")}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="px-4 pt-2 text-[11px] text-red-400">{error}</p>}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {!canInteract ? (
              <div className="text-[12px] text-[var(--text-muted)] mt-4">
                <p className="mb-2 font-semibold text-[var(--text-main)]">{t("visitor.previewTitle", "Preview mode")}</p>
                <p className="mb-3">{t("visitor.previewBody", "You can explore the chat UI, but you’ll need an account to send messages and save history.")}</p>
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(undefined, {
                      title: "Create a free account",
                      subtitle: "Log in or sign up to send messages and save your AI chats.",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-[12px]"
                >
                  {t("visitor.previewCta", "Log in / Sign up")}
                </button>
              </div>
            ) : loadingMessages && messages.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">{t("messages.loading", "Loading conversation…")}</p>
            ) : messages.length === 0 ? (
              <div className="text-[12px] text-[var(--text-muted)] mt-4">
                <p className="mb-1">{t("suggestion.start", "Start by asking something like:")}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t("suggestion.1", "Help me plan my week around work and personal goals.")}</li>
                  <li>{t("suggestion.2", "Turn my todo list into 3 clear priorities.")}</li>
                  <li>{t("suggestion.3", "I feel overwhelmed — where should I start today?")}</li>
                </ul>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] whitespace-pre-wrap ${m.role === "user"
                      ? "bg-[var(--accent)] text-[var(--bg-body)] rounded-br-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-main)] rounded-bl-sm border border-[var(--border-subtle)]"
                      }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-[var(--border-subtle)] px-3 py-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="hidden md:inline">{t("categoryLabel", "Category:")}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-[11px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-[var(--text-muted)]">{t("category.help", "Helps the AI adapt tone & suggestions.")}</span>
            </div>

            <div className="flex items-end gap-2">

              {/* PRO Feature: Attachment */}
              <div className="flex items-center gap-1 shrink-0 pb-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.md,.js,.ts,.tsx,.json,.csv,.py"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={!isPro ? t("pro.locked", "Pro feature") : t("attach", "Attach file")}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[14px] relative"
                >
                  📎
                  {!isPro && <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  title={!isPro ? t("pro.locked", "Pro feature") : t("generateImage", "Generate image")}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[14px] relative"
                >
                  🎨
                  {!isPro && <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>}
                </button>

                {/* Voice Capture */}
                {user ? (
                  <VoiceCaptureButton userId={user.id} mode="review" onResult={handleVoiceResult} variant="compact" />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      requireAuth(undefined, {
                        title: t("gate.loginToVoice.title", "Log in to use voice"),
                        subtitle: t("gate.loginToVoice.subtitle", "Voice capture saves your chats to your account."),
                      })
                    }
                    className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[12px]"
                    title={t("composer.voice", "Voice")}
                  >
                    🎤
                  </button>
                )}
              </div>

              <textarea
                value={input}
                readOnly={!canInteract}
                onFocus={() => {
                  if (canInteract) return;
                  requireAuth(undefined, {
                    title: "Log in to chat",
                    subtitle: "Create a free account to message the AI and save your conversations.",
                  });
                }}
                onChange={(e) => {
                  if (!requireAuth()) return;
                  setInput(e.target.value);
                }}
                placeholder={t("input.placeholder", "Ask anything — planning, focus, ideas, mindset…")}
                className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-main)] min-h-[48px] max-h-[120px] resize-y"
              />
              <button
                type="submit"
                onClick={(e) => {
                  if (!canInteract) {
                    e.preventDefault();
                    requireAuth(undefined, {
                      title: "Log in to send",
                      subtitle: "Create a free account to send messages to the AI.",
                    });
                  }
                }}
                disabled={sending || (!canInteract ? false : !input.trim()) || (canInteract && !isPro && remaining <= 0)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-[13px]"
              >
                {sending ? t("input.sending", "Sending…") : canInteract && !isPro && remaining <= 0 ? t("input.limitReached", "Daily limit reached") : t("input.send", "Send")}
              </button>
            </div>
          </form>

          {showMobileThreads && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileThreads(false)} />
              <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-[var(--bg-body)] border-r border-[var(--border-subtle)] flex flex-col">
                <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{t("mobile.historyTitle", "Conversation history")}</p>
                  <button
                    type="button"
                    onClick={() => setShowMobileThreads(false)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                  >
                    {t("mobile.closeButton", "✕ Close")}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
                  {!user ? (
                    <div className="p-3 text-[11px] text-[var(--text-muted)]">
                      <p className="font-semibold text-[var(--text-main)] mb-1">{t("visitor.mobileTitle", "Preview mode")}</p>
                      <p className="mb-2">{t("visitor.mobileBody", "Log in to access your chat history on mobile.")}</p>
                      <button
                        type="button"
                        onClick={() =>
                          requireAuth(undefined, {
                            title: "Log in to view history",
                            subtitle: "Create an account to access your saved conversations.",
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-[11px]"
                      >
                        {t("visitor.mobileCta", "Log in / Sign up")}
                      </button>
                    </div>
                  ) : loadingThreads ? (
                    <p className="p-3 text-[var(--text-muted)] text-[11px]">{t("sidebar.loading", "Loading conversations…")}</p>
                  ) : threads.length === 0 ? (
                    <p className="p-3 text-[var(--text-muted)] text-[11px]">{t("mobile.empty", "No conversations yet. Start a new chat.")}</p>
                  ) : (
                    threads.map((thread) => {
                      const isActive = activeThreadId === thread.id;
                      const isBusy = threadActionId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${isActive ? "bg-[var(--bg-card)] text-[var(--text-main)]" : "hover:bg-[var(--bg-elevated)] text-[var(--text-main)]"
                            }`}
                          onClick={() => {
                            if (!requireAuth()) return;
                            setActiveThreadId(thread.id);
                            setShowMobileThreads(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{thread.title || t("sampleTitle", "New conversation")}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{categoryLabel(thread.category || "General")}</p>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleRenameThread(thread)}
                              disabled={isBusy}
                              className="p-1 rounded hover:bg-[var(--bg-card)] text-[11px]"
                              title={t("edit", "Edit")}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteThread(thread.id)}
                              disabled={isBusy}
                              className="p-1 rounded hover:bg-[var(--bg-card)] text-[11px] text-red-400"
                              title={t("delete", "Delete")}
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

          {/* ✅ Auth modal (reusable) */}
          <AuthGateModal open={authOpen} onClose={closeAuth} authHref={authHref} copy={authCopy} />

        </section>
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="fixed bottom-[80px] left-0 md:left-64 right-0 px-4 py-2 z-10 pointer-events-none">
          <div className="flex gap-2 overflow-x-auto pointer-events-auto">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 shadow-lg text-xs">
                <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-[var(--text-muted)] hover:text-red-400"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Generation Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xl p-5">
            <h2 className="text-lg font-semibold mb-2">{t("imageModal.title", "Generate an Image")} 🎨</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">{t("imageModal.subtitle", "Describe what you want to see. DALL-E 3 will create it.")}</p>

            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="A calm forest with sunlight streaming through..."
              className="w-full h-32 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-xl text-xs hover:bg-[var(--bg-elevated)]"
              >
                {t("buttons.cancel", "Cancel")}
              </button>
              <button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || !isPro}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {t("buttons.generate", "Generate")}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
