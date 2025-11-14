// app/templates/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type Template = {
  id: string;
  user_id: string | null;
  title: string | null;
  description: string | null;
  ai_prompt: string | null;
  category: string | null;
  is_public: boolean;
  usage_count: number | null;
  created_at: string | null;
};

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tmpl, setTmpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Load user
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

  // Load template
  useEffect(() => {
    if (!templateId) return;

    async function loadTemplate() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const { data, error } = await supabase
          .from("templates")
          .select("*")
          .eq("id", templateId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setError("Template not found.");
          setTmpl(null);
          return;
        }

        const t = data as Template;
        setTmpl(t);
        setTitle(t.title || "");
        setDescription(t.description || "");
        setAiPrompt(t.ai_prompt || "");
        setCategory(t.category || "");
        setIsPublic(!!t.is_public);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load template.");
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [templateId]);

  const isOwner = !!user && tmpl && tmpl.user_id === user.id;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !tmpl) return;

    if (!isOwner) {
      setError("You can only edit templates you created.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("templates")
        .update({
          title: title.trim() || null,
          description: description.trim() || null,
          ai_prompt: aiPrompt.trim() || null,
          category: category.trim() || null,
          is_public: isPublic,
        })
        .eq("id", tmpl.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setSuccess("Template updated.");
    } catch (err: any) {
      console.error(err);
      setError("Failed to update template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !tmpl) return;
    if (!isOwner) {
      setError("You can only delete templates you created.");
      return;
    }

    if (!confirm("Delete this template? This cannot be undone.")) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", tmpl.id)
        .eq("user_id", user.id);

      if (error) throw error;

      router.push("/templates");
    } catch (err: any) {
      console.error(err);
      setError("Failed to delete template.");
    } finally {
      setDeleting(false);
    }
  }

  function handleUseWithAssistant() {
    if (!tmpl) return;
    if (typeof window === "undefined") return;

    const titleSafe =
      tmpl.title || (tmpl as any).name || "this template";

    const promptSafe =
      tmpl.ai_prompt || (tmpl as any).prompt || "";

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: promptSafe || `Use this template: "${titleSafe}".`,
          hint: `Use this template: "${titleSafe}". I may add more details before sending.`,
        },
      })
    );
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="templates" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <button
            onClick={() => router.push("/templates")}
            className="text-[11px] text-slate-400 hover:text-indigo-300 mb-3"
          >
            ← Back to Templates
          </button>

          {loading ? (
            <p className="text-slate-300 text-sm">Loading template…</p>
          ) : !tmpl ? (
            <p className="text-slate-300 text-sm">
              {error || "Template not found."}
            </p>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-4 border border-slate-800 bg-slate-900/60 rounded-2xl p-4"
            >
              <h1 className="text-xl md:text-2xl font-bold mb-1">
                {tmpl.title || "Untitled template"}
              </h1>
              <p className="text-[11px] text-slate-400 mb-2">
                {isOwner
                  ? "Edit your template, or use it with the AI assistant."
                  : "This is a shared template. You can use it with the assistant, but only the creator can edit it."}
              </p>

              {error && (
                <p className="text-xs text-red-400 mb-1">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-400 mb-1">
                  {success}
                </p>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isOwner}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!isOwner}
                  placeholder="e.g. Planning, Study, Writing"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isOwner}
                  className="w-full min-h-[80px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  AI prompt
                </label>
                <p className="text-[11px] text-slate-400 mb-1">
                  This is what will be sent to the AI when you use this
                  template.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={!isOwner}
                  className="w-full min-h-[140px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                />
              </div>

              {/* Public toggle (owner only) */}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  <span className="text-[11px] text-slate-300">
                    Make this template public (visible in the marketplace)
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleUseWithAssistant}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs md:text-sm"
                >
                  🤖 Use with Assistant
                </button>

                {isOwner && (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 rounded-xl border border-red-600 text-red-300 hover:bg-red-950/40 text-xs md:text-sm disabled:opacity-60"
                    >
                      {deleting ? "Deleting..." : "Delete template"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
