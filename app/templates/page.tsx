"use client";

import { useState } from "react";
import Link from "next/link";

const templates = [
  {
    id: "summarize",
    title: "Summarize this note",
    description: "Condense long text into key bullet points or a short summary.",
    prompt: "Summarize the following note clearly and concisely:",
    icon: "📝",
  },
  {
    id: "brainstorm",
    title: "Brainstorm ideas",
    description: "Generate creative ideas for a topic or problem.",
    prompt: "Brainstorm ideas about:",
    icon: "💡",
  },
  {
    id: "action",
    title: "Make it actionable",
    description: "Turn a note or thought into specific steps or tasks.",
    prompt: "Convert this into a clear list of actionable tasks:",
    icon: "✅",
  },
  {
    id: "rewrite",
    title: "Rewrite for clarity",
    description: "Rephrase your writing to make it sound more clear and professional.",
    prompt: "Rewrite this for clarity and professionalism:",
    icon: "🗣️",
  },
];

export default function TemplatesPage() {
  const [selected, setSelected] = useState<any | null>(null);
  const [inputText, setInputText] = useState("");

  function handleOpenTemplate(t: any) {
    setSelected(t);
    setInputText("");
  }

  function handleUseInAssistant() {
    if (!selected) return;

    const text = inputText.trim();
    if (!text) return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-assistant-context", {
          detail: {
            // This becomes extra context inside the assistant
            content: text,
            // This becomes the initial message in the assistant input
            hint: `${selected.prompt}\n\n${text}`,
          },
        })
      );
    }

    // Close modal and reset
    setSelected(null);
    setInputText("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="text-sm font-semibold tracking-tight">
              AI Productivity Hub
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-900 text-xs sm:text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">AI Templates</h1>
        <p className="text-slate-400 mb-8 text-sm">
          Use these pre-built prompts to speed up your workflow. When you pick a
          template, your text will be sent into the AI assistant.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleOpenTemplate(t)}
              className="text-left border border-slate-800 bg-slate-900/60 rounded-2xl p-4 hover:bg-slate-800 transition group"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <h3 className="text-base font-semibold mb-1 group-hover:text-indigo-400">
                {t.title}
              </h3>
              <p className="text-xs text-slate-400">{t.description}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-3 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
              <h2 className="text-lg font-semibold mb-2">{selected.title}</h2>
              <p className="text-slate-400 text-sm mb-3">
                {selected.description}
              </p>
              <p className="text-[11px] text-slate-500 mb-2">
                Your text here will be sent into the assistant with this
                instruction:
                <br />
                <span className="text-slate-300">
                  {selected.prompt}
                </span>
              </p>
              <textarea
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-2 text-sm text-slate-100"
                placeholder="Paste or type your note/text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUseInAssistant}
                  disabled={!inputText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
                >
                  Open in Assistant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
