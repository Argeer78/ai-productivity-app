"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [externalContext, setExternalContext] = useState("");
  const [systemHint, setSystemHint] = useState("");

  // Listen for "Use with Assistant" events from pages (templates, notes, tasks, etc.)
  useEffect(() => {
    function handleContext(event: Event) {
      const custom = event as CustomEvent<{
        content?: string;
        hint?: string;
      }>;

      const detail = custom.detail || {};
      const content = detail.content || "";
      const hint = detail.hint || "";

      setIsOpen(true);
      setExternalContext(content);
      setSystemHint(hint);

      // Optional intro message
      if (hint) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I loaded a template for you. Add any extra details and hit Send.",
          },
        ]);
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "ai-assistant-context",
        handleContext as EventListener
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "ai-assistant-context",
          handleContext as EventListener
        );
      }
    };
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 👇 Change this URL if your assistant API route has a different name
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          externalContext,
          systemHint,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Assistant failed");
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setError("AI error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-sm shadow-lg border border-indigo-400"
        >
          🤖 Assistant
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur flex flex-col max-h-[420px]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-xl bg-indigo-600 flex items-center justify-center text-[11px] font-bold">
                  AI
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-100">
                    AI Assistant
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Ask anything, or refine your notes/tasks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Context hint */}
            {systemHint && (
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60">
                <p className="text-[10px] text-slate-400 whitespace-pre-wrap">
                  <span className="font-semibold text-slate-300">
                    Template loaded:
                  </span>{" "}
                  {systemHint}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
              {messages.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  Start by typing a question, or click{" "}
                  <span className="font-semibold">Use with Assistant</span>{" "}
                  on any template, note, or task.
                </p>
              )}

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[90%] px-3 py-2 rounded-xl ${
                    m.role === "user"
                      ? "ml-auto bg-indigo-600 text-slate-50"
                      : "mr-auto bg-slate-800 text-slate-100"
                  }`}
                >
                  {m.content}
                </div>
              ))}

              {error && (
                <p className="text-[11px] text-red-400 mt-1">{error}</p>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={sendMessage}
              className="border-t border-slate-800 px-3 py-2 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something…"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs disabled:opacity-60"
              >
                {loading ? "…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
