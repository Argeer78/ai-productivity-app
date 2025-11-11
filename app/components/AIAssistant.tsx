"use client";

import React, { useState, useEffect } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [externalContext, setExternalContext] = useState<string | null>(null);

    // Listen for external context events from pages (notes/tasks)
  // so they can send content into the assistant.
  React.useEffect(() => {
    function handleContextEvent(e: any) {
      const detail = e.detail || {};
      const content = detail.content as string | undefined;
      const hint = detail.hint as string | undefined;

      if (content) {
        setExternalContext(content);
      } else {
        setExternalContext(null);
      }

      // Optional: pre-fill a suggested question
      if (hint) {
        setInput(hint);
      }

      // Open the assistant when context is sent
      setOpen(true);
    }

    window.addEventListener(
      "ai-assistant-context",
      handleContextEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "ai-assistant-context",
        handleContextEvent as EventListener
      );
    };
  }, []);

async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
            const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context:
            "The user is using an AI productivity web app with notes, tasks, and a dashboard." +
            (externalContext
              ? "\n\nHere is extra context (note or task):\n" +
                externalContext
              : ""),
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("Non-JSON response from /api/assistant:", text);
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.reply) {
        console.error("Assistant error payload:", data);
        setError(data.error || "Assistant failed to respond.");
        setLoading(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("Network error talking to the assistant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-indigo-600 hover:bg-indigo-500 text-slate-50 shadow-lg shadow-indigo-900/40 px-4 py-2 text-sm flex items-center gap-2"
      >
        <span>✨</span>
        <span>AI Assistant</span>
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed bottom-16 right-4 z-40 w-[320px] sm:w-[360px] max-h-[70vh] rounded-2xl border border-slate-800 bg-slate-950/95 text-slate-100 shadow-xl flex flex-col">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">AI Productivity Assistant</p>
              <p className="text-[11px] text-slate-400">
                Ask for summaries, plans, or writing help.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-100 text-xs px-2"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 text-xs space-y-2">
            {messages.length === 0 && (
              <div className="text-[11px] text-slate-400">
                Try something like:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>“Summarize my day into 3 bullet points.”</li>
                  <li>“Turn this into tasks: [paste your note].”</li>
                  <li>“Help me plan tomorrow in 5 steps.”</li>
                </ul>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 ${
                  m.role === "user"
                    ? "bg-slate-900/80 border border-slate-800 self-end"
                    : "bg-slate-950 border border-indigo-700/70"
                }`}
              >
                <p className="text-[10px] mb-1 text-slate-400">
                  {m.role === "user" ? "You" : "Assistant"}
                </p>
                <p className="whitespace-pre-wrap text-[12px]">
                  {m.content}
                </p>
              </div>
            ))}

            {loading && (
              <p className="text-[11px] text-slate-400">Thinking…</p>
            )}

            {error && (
              <p className="text-[11px] text-red-400">{error}</p>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-800 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for help with notes, tasks, or planning..."
              className="w-full resize-none rounded-xl bg-slate-950 border border-slate-700 text-[12px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
            <div className="mt-1 flex justify-end">
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-[12px]"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
