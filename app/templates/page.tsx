"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Template = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  prompt: string;
  category: string | null;
  is_pro_only: boolean | null;
  created_at: string | null;
};

const CATEGORY_OPTIONS = [
  "All",
  "Planning",
  "Study",
  "Writing",
  "Work",
  "Personal",
];

export default function TemplatesPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Simple inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editCategory, setEditCategory] = useState("Planning");
  const [editIsProOnly, setEditIsProOnly] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("templates")
          .select(
            "id, user_id, name, description, prompt, category, is_pro_only, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTemplates((data || []) as Template[]);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load templates.");
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (showOnlyMine && user && t.user_id !== user.id) {
        return false;
      }

      if (categoryFilter !== "All") {
        if ((t.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const combined = `${t.name} ${t.description || ""} ${t.prompt}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [templates, search, categoryFilter, showOnlyMine, user]);

  function handleUseWithAssistant(t: Template) {
    if (typeof window === "undefined") return;

    const content = t.prompt || "";
    const hint =
      t.name ||
      t.description ||
      "Use this template inside the assistant to get started faster.";

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content,
          hint,
        },
      })
    );
  }

  function startEditing(t: Template) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDescription(t.description || "");
    setEditPrompt(t.prompt);
    setEditCategory(t.category || "Planning");
    setEditIsProOnly(!!t.is_pro_only);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditPrompt("");
    setEditCategory("Planning");
    setEditIsProOnly(false);
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editName.trim() || !editPrompt.trim()) return;

    setSavingEdit(true);
    setError("");

    try {
      const { error } = await supabase
        .from("templates")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          prompt: editPrompt.trim(),
          category: editCategory.trim() || null,
          is_pro_only: editIsProOnly,
        })
        .eq("id", editingId)
        .eq("user_id", user?.id); // only allow editing own templates

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: editName.trim(),
                description: editDescription.trim() || null,
                prompt: editPrompt.trim(),
                category: editCategory.trim() || null,
                is_pro_only: editIsProOnly,
              }
            : t
        )
      );

      cancelEditing();
    } catch (err: any) {
      console.error(err);
      setError("Failed to save template changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!user) return;
    if (!confirm("Delete this template? This can’t be undone.")) return;

    setDeletingId(id);
    setError("");

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // only delete own templates

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error(err);
      setError("Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
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
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                AI Templates
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Quick starting points for the assistant, planning, and writing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
              <Link
                href="/dashboard"
                className="px-3 py-1 rounded-xl border border-slate-700 hover:bg-slate-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Filters bar */}
          <div className="mb-5 flex flex-wrap gap-3 items-center text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs md:text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {user && (
              <label className="flex items-center gap-1 text-[11px] md:text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showOnlyMine}
                  onChange={(e) => setShowOnlyMine(e.target.checked)}
                  className="h-3 w-3"
                />
                Show only my templates
              </label>
            )}
          </div>

          {error && (
            <div className="mb-3 text-sm text-red-400">{error}</div>
          )}

          {loading ? (
            <p className="text-sm text-slate-300">Loading templates…</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-sm text-slate-400">
              No templates match this filter yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {filteredTemplates.map((t) => {
                const isOwner = user && t.user_id === user.id;
                const isEditing = editingId === t.id;

                return (
                  <article
                    key={t.id}
                    className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4 flex flex-col justify-between"
                  >
                    {/* Top: main content */}
                    <div>
                      {/* Category + Pro badge */}
                      <div className="flex items-center justify-between mb-2 text-[11px]">
                        <div className="flex gap-2 items-center">
                          {t.category && (
                            <span className="px-2 py-0.5 rounded-full border border-slate-700 bg-slate-950 text-slate-300">
                              {t.category}
                            </span>
                          )}
                          {t.is_pro_only && (
                            <span className="px-2 py-0.5 rounded-full border border-amber-400/70 bg-amber-500/10 text-amber-200">
                              PRO
                            </span>
                          )}
                        </div>
                        {t.created_at && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 text-[11px]">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                            placeholder="Template name"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) =>
                              setEditDescription(e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100 min-h-[60px]"
                            placeholder="Short description"
                          />
                          <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100 min-h-[80px]"
                            placeholder="Prompt that will be sent to AI"
                          />
                          <div className="flex flex-wrap gap-2 items-center">
                            <select
                              value={editCategory}
                              onChange={(e) =>
                                setEditCategory(e.target.value)
                              }
                              className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                            >
                              {CATEGORY_OPTIONS.filter(
                                (c) => c !== "All"
                              ).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1 text-[10px] text-slate-300">
                              <input
                                type="checkbox"
                                checked={editIsProOnly}
                                onChange={(e) =>
                                  setEditIsProOnly(e.target.checked)
                                }
                                className="h-3 w-3"
                              />
                              Pro-only
                            </label>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="font-semibold text-sm mb-1 text-slate-50">
                            {t.name}
                          </h2>
                          {t.description && (
                            <p className="text-xs text-slate-300 mb-2 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 line-clamp-3">
                            {t.prompt}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Bottom: actions */}
                    <div className="mt-3 flex flex-wrap gap-2 justify-between items-center">
                      <button
                        onClick={() => handleUseWithAssistant(t)}
                        className="text-[11px] px-3 py-1 rounded-xl border border-slate-700 hover:bg-slate-900"
                      >
                        🤖 Use with Assistant
                      </button>

                      {isOwner && (
                        <div className="flex gap-2 text-[11px]">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                disabled={savingEdit}
                                className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
                              >
                                {savingEdit ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 rounded-xl border border-slate-700 hover:bg-slate-900"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(t)}
                                className="px-2 py-1 rounded-xl border border-slate-700 hover:bg-slate-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTemplate(t.id)}
                                disabled={deletingId === t.id}
                                className="px-2 py-1 rounded-xl border border-red-500/70 text-red-300 hover:bg-red-900/30 disabled:opacity-60"
                              >
                                {deletingId === t.id ? "…" : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
