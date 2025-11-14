// app/templates/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Template = {
  id: string;
  user_id: string | null;
  title: string | null;
  description: string | null;
  ai_prompt: string | null;
  category: string | null;
  is_public: boolean;
  is_pro_only: boolean | null;
  usage_count: number | null;
  created_at: string | null;
};

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id; // ✅ useParams instead of props

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [tmpl, setTmpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Local editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isProOnly, setIsProOnly] = useState(false);

  // 1) Load current user
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

  // 2) Load plan
  useEffect(() => {
    if (!user) {
      setPlan("free");
      return;
    }

    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Template detail: plan load error", error);
          return;
        }

        if (data?.plan === "pro") setPlan("pro");
        else setPlan("free");
      } catch (err) {
        console.error(err);
      }
    }

    loadPlan();
  }, [user]);

  // 3) Load template by id
  useEffect(() => {
    async function loadTemplate() {
      if (!id) {
        // No id in URL – nothing to fetch
        setError("Template not found.");
        setTmpl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const { data, error } = await supabase
          .from("templates")
          .select(
            "id, user_id, title, description, ai_prompt, category, is_public, is_pro_only, usage_count, created_at"
          )
          .eq("id", id) // ✅ id is now a real string
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Template detail: load error", error);
          setError("Failed to load template.");
          setTmpl(null);
        } else if (!data) {
          setError("Template not found.");
          setTmpl(null);
        } else {
          const t = data as Template;
          setTmpl(t);
          setTitle(t.title || "");
          setDescription(t.description || "");
          setAiPrompt(t.ai_prompt || "");
          setCategory(t.category || "");
          setIsPublic(!!t.is_public);
          setIsProOnly(!!t.is_pro_only);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load template.");
        setTmpl(null);
      } finally {
        setLoading(false);
      }
    }

    if (!checkingUser) {
      loadTemplate();
    }
  }, [id, checkingUser]);

  const isMine = user && tmpl && tmpl.user_id === user.id;
  const isProTemplate = !!tmpl?.is_pro_only || isProOnly;
  const isProUser = plan === "pro";
  const locked = !!tmpl && isProTemplate && !isProUser && !isMine;

  // 4) Use with Assistant (same pattern, BUT gated)
  function handleUseWithAssistant() {
    if (!tmpl) return;
    if (typeof window === "undefined") return;

    if (locked) {
      window.location.href = "/dashboard#pricing";
      return;
    }

    const safeTitle = tmpl.title || "this template";
    const safePrompt = tmpl.ai_prompt || "";

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content:
            safePrompt || `Use this template: "${safeTitle}".`,
          hint: `Use this template: "${safeTitle}". I may add extra details before sending.`,
        },
      })
    );
  }

  // 5) Save (only owner can edit)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tmpl || !user || !isMine) return;

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
          is_pro_only: isProOnly,
        })
        .eq("id", tmpl.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to save template.");
        return;
      }

      setSuccess("Template updated.");
    } catch (err) {
      console.error(err);
      setError("Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  // 6) Delete (only owner)
  async function handleDelete() {
    if (!tmpl || !user || !isMine) return;

    if (!confirm("Delete this template permanently?")) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", tmpl.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to delete template.");
        setDeleting(false);
        return;
      }

      router.push("/templates");
    } catch (err) {
      console.error(err);
      setError("Failed to delete template.");
      setDeleting(false);
    }
  }

  if (checkingUser || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading template…</p>
      </main>
    );
  }

  if (!tmpl) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="templates" />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-slate-300 text-sm mb-3">
            {error || "Template not found."}
          </p>
          <Link
            href="/templates"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Back to templates
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="templates" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-bold">
              {tmpl.title || "Untitled template"}
            </h1>
            <Link
              href="/templates"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to templates
            </Link>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            {tmpl.is_public ? "Public" : "Private"}
            {isProTemplate && " • Pro template"}
            {isMine ? " • Yours" : ""}
          </p>

          {locked && (
            <div className="mb-4 rounded-xl border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              This is a <span className="font-semibold">Pro template</span>.
              You can preview it, but only Pro users (or the owner) can use it
              with the AI assistant.
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 mb-2">{success}</p>
          )}

          {/* Use with Assistant button (gated) */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleUseWithAssistant}
              disabled={locked}
              className={`px-4 py-2 rounded-xl border border-slate-700 text-xs mr-3 ${
                locked
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-slate-900"
              }`}
            >
              🤖 Use with Assistant
            </button>

            {locked && (
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard#pricing")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

          {/* Edit form – only editable if it's your template */}
          <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                disabled={!isMine}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Short description
              </label>
              <textarea
                value={description}
                disabled={!isMine}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm min-h-[80px] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Underlying AI prompt
              </label>
              <textarea
                value={aiPrompt}
                disabled={!isMine}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm min-h-[140px] disabled:opacity-60"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                This is what gets sent to the AI when you use this template.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  disabled={!isMine}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm disabled:opacity-60"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={isPublic}
                  disabled={!isMine}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                <span>Public template</span>
              </label>

              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={isProOnly}
                  disabled={!isMine}
                  onChange={(e) => setIsProOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                <span>Pro only</span>
              </label>
            </div>

            {isMine && (
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl border border-red-500 text-red-300 hover:bg-red-950/40 text-sm disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete template"}
                </button>
              </div>
            )}

            {!isMine && (
              <p className="text-[11px] text-slate-500 mt-2">
                You can view this template, but only the owner can edit or
                delete it.
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
