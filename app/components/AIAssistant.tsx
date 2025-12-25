"use client";

import { useEffect, useState, useCallback } from "react";
import type React from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useT } from "@/lib/useT";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistant() {
  const pathname = usePathname();

  // Hide assistant completely on pages that already have dedicated chat UIs
  if (pathname.startsWith("/ai-chat") || pathname.startsWith("/ai-companion")) {
    return null;
  }

  const { t, tCommon } = useT("assistant");

  // UI language (e.g. "en", "el", "es")
  const languageCtx = useLanguage();
  const uiLangCode = ((languageCtx as any)?.lang || "en") as string;
  const uiLangBase = uiLangCode.split("-")[0] || "en";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        t(
          "template.hintFallback",
          "I loaded a template for you. Add any extra details and hit Send."
        );

      const content =
        detail.content ||
        t("template.contentFallback", "Use this template: (no content provided).");

      setOpen(true);
      setMessages([{ role: "assistant", content: hint }]);
      setInput(content);
    }

    window.addEventListener("ai-assistant-context", handler);
    return () => window.removeEventListener("ai-assistant-context", handler);
  }, [t]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    setError("");
    setLoading(true);

    const newMessages: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          // ✅ IMPORTANT: Do NOT send userId here so this assistant DOES NOT count as an AI call
          uiLang: uiLangBase, // tell server what language to respond in
        }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Assistant: non-JSON response", text);
        setError(t("error.invalidResponse", "Server returned an invalid response."));
        setLoading(false);
        return;
      }

      if (!res.ok || !data.answer) {
        console.error("Assistant: error payload", data);
        setError(data.error || t("error.generic", "AI error. Please try again."));
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      console.error("Assistant: network error", err);
      setError(t("error.network", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, uiLangBase, t]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Toggle button – bottom-left */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-4 z-40 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs shadow-lg"
      >
        {open ? t("toggle.close", "Close AI") : t("toggle.open", "Open AI")}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-16 left-4 z-40 w-full max-w-md border border-[var(--border-subtle)] rounded-2xl bg-[color-mix(in srgb,var(--bg-body) 95%,transparent)] backdrop-blur p-3 text-xs text-[var(--text-main)] shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-[13px]">{t("title", "AI Assistant")}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              aria-label={tCommon("close", "Close")}
            >
              ✕
            </button>
          </div>

          <div className="h-44 overflow-y-auto border border-[var(--border-subtle)] rounded-xl p-2 mb-2 bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] space-y-2">
            {messages.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                {t(
                  "empty",
                  'Ask anything about your notes, tasks, or use a template via “Use with Assistant”.'
                )}
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-[11px] leading-relaxed ${
                    m.role === "user" ? "text-[var(--text-main)]" : "text-indigo-200"
                  }`}
                >
                  <span className="font-semibold mr-1">
                    {m.role === "user" ? t("role.you", "You") : t("role.ai", "AI")}:
                  </span>
                  {m.content}
                </div>
              ))
            )}
          </div>

          {error && <p className="text-[11px] text-red-400 mb-1">{error}</p>}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder", "Type a question... (Enter = send, Shift+Enter = newline)")}
            className="w-full text-[11px] rounded-xl bg-[var(--bg-body)] border border-[var(--border-subtle)] px-2 py-1.5 mb-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--text-main)]"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-[11px]"
          >
            {loading ? t("button.thinking", "Thinking...") : t("button.send", "Send")}
          </button>
        </div>
      )}
    </>
  );
}
