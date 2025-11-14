"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Load user ID once
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUserId(data?.user?.id ?? null);
      })
      .catch((err) => {
        console.error("Assistant: getUser error", err);
      });
  }, []);

  // Handle "Use with Assistant" template events
  useEffect(() => {
    function handler(e: Event) {
      const custom = e as CustomEvent<{
        content?: string;
        hint?: string;
      }>;

      const detail = custom.detail || {};
      const hint =
        detail.hint ||
        'I loaded a template for you. Add any extra details and hit Send.';
      const content =
        detail.content ||
        "Use this template: (no content provided).";

      setOpen(true);
      setMessages([
        {
          role: "assistant",
          content: hint,
        },
      ]);
      setInput(content);
    }

    window.addEventListener("ai-assistant-context", handler);
    return () => {
      window.removeEventListener("ai-assistant-context", handler);
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    setError("");
    setLoading(true);

    const newMessages: Msg[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          userId,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Assistant: non-JSON response", text);
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.answer) {
        console.error("Assistant: error payload", data);
        setError(data.error || "AI error. Please try again.");
        setLoading(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      console.error("Assistant: network error", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Floating button + panel
  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs shadow-lg"
      >
        {open ? "Close AI" : "Open AI"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-16 right-4 z-40 w-full max-w-md border border-slate-800 rounded-2xl bg-slate-950/95 backdrop-blur p-3 text-xs text-slate-100 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-[13px]">AI Assistant</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="h-44 overflow-y-auto border border-slate-800 rounded-xl p-2 mb-2 bg-slate-950/80 space-y-2">
            {messages.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Ask anything about your notes, tasks, or use a template via
                “Use with Assistant”.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-[11px] leading-relaxed ${
                    m.role === "user" ? "text-slate-100" : "text-indigo-200"
                  }`}
                >
                  <span className="font-semibold mr-1">
                    {m.role === "user" ? "You" : "AI"}:
                  </span>
                  {m.content}
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="text-[11px] text-red-400 mb-1">{error}</p>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a question... (Enter = send, Shift+Enter = newline)"
            className="w-full text-[11px] rounded-xl bg-slate-950 border border-slate-700 px-2 py-1.5 mb-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-[11px]"
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      )}
    </>
  );
}
