"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Plan = "free" | "pro";

type TemplateDef = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  proOnly?: boolean;
};

const templates: TemplateDef[] = [
  {
    id: "summarize",
    title: "Summarize this note",
    description: "Condense long text into key bullet points or a short summary.",
    prompt: "Summarize the following note clearly and concisely:",
    icon: "📝",
  },
  {
    id: "brainstorm",
    title: "Brainstorm ideas (Pro)",
    description: "Generate creative ideas for a topic or problem with more depth.",
    prompt: "Brainstorm ideas about this topic. Be creative and practical:",
    icon: "💡",
    proOnly: true,
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
    title: "Rewrite for clarity (Pro)",
    description: "Rephrase your writing to make it clearer and more professional.",
    prompt: "Rewrite this for clarity, conciseness, and a professional tone:",
    icon: "🗣️",
    proOnly: true,
  },
];

export default function TemplatesPage() {
  const [selected, setSelected] = useState<TemplateDef | null>(null);
  const [inputText, setInputText] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  // Load user & plan
  useEffect(() => {
    async function loadUserAndPlan() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Templates: getUser error", error);
        }
        const currentUser = data?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setPlan("free");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("Templates: profile error", profileError);
        }

        setPlan((profile?.plan as Plan) || "free");
      } catch (err) {
        console.error("Templates: loadUserAndPlan error", err);
      } finally {
        setCheckingUser(false);
      }
    }

    loadUserAndPlan();
  }, []);

  function handleOpenTemplate(t: TemplateDef) {
    setSelected(t);
    setInputText("");
    setUpgradeMessage("");
  }

  function handleUseInAssistant() {
    if (!selected) return;

    const text = inputText.trim();
    if (!text) return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-assistant-context", {
          detail: {
            content: text,
            hint: `${selected.prompt}\n\n${text}`,
          },
        })
      );
    }

    setSelected(null);
    setInputText("");
  }

  function handleTemplateClick(t: TemplateDef) {
    if (t.proOnly && plan !== "pro") {
      setUpgradeMessage(
        "This template is available on the Pro plan. Open your Dashboard to upgrade and unlock all templates."
      );
      return;
    }
    handleOpenTemplate(t);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header + Navigation */}
      <AppHeader active="templates" />
      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              AI Templates
            </h1>
            <p className="text-slate-400 text-sm">
              Use these pre-built prompts to speed up your workflow.
            </p>
          </div>
          <div className="text-xs text-slate-300">
            Current plan:{" "}
            <span className="font-semibold uppercase">{plan}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mb-4">
          Some templates are marked <span className="text-amber-300">PRO</span>{" "}
          and are only available on the Pro plan.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const locked = t.proOnly && plan !== "pro";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateClick(t)}
                className={`relative text-left border border-slate-800 rounded-2xl p-4 transition group ${
                  locked
                    ? "bg-slate-900/40 cursor-pointer hover:bg-slate-900/60"
                    : "bg-slate-900/60 hover:bg-slate-800"
                }`}
              >
                {t.proOnly && (
                  <span className="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/70 text-amber-300 bg-slate-950/80">
                    PRO
                  </span>
                )}
                <div className="text-2xl mb-2">{t.icon}</div>
                <h3
                  className={`text-base font-semibold mb-1 ${
                    locked
                      ? "text-slate-400 group-hover:text-slate-200"
                      : "group-hover:text-indigo-400"
                  }`}
                >
                  {t.title}
                </h3>
                <p className="text-xs text-slate-400">{t.description}</p>
                {locked && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    Pro plan required
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {upgradeMessage && (
          <p className="mt-4 text-xs text-amber-300 max-w-md">
            {upgradeMessage} You can upgrade from the{" "}
            <Link
              href="/dashboard"
              className="underline hover:text-amber-200"
            >
              dashboard
            </Link>
            .
          </p>
        )}

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
                <span className="text-slate-300">{selected.prompt}</span>
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
