// app/templates/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  usage_count?: number | null; // made optional so we don't rely on the column existing
  created_at: string | null;
};

export default function TemplatesPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  // Load plan from profiles
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
          console.error("Templates: plan load error", error);
          return;
        }

        if (data?.plan === "pro") {
          setPlan("pro");
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadPlan();
  }, [user]);

  // Load templates (both public + mine if logged in)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        let query = supabase
          .from("templates")
          .select(
            // removed usage_count from select so we don't depend on the column
            "id, user_id, title, description, ai_prompt, category, is_public, is_pro_only, created_at"
          );

        if (user) {
          // Show all public templates + my private ones
          query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
        } else {
          // Only public if not logged in
          query = query.eq("is_public", true);
        }

        const { data, error: tmplError } = await query.order("created_at", {
          ascending: false,
        });

        if (tmplError && (tmplError as any).code !== "PGRST116") {
          console.error("Templates: templates load error", tmplError);
          setTemplates([]);
        } else {
          setTemplates((data || []) as Template[]);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load templates.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    if (!checkingUser) {
      loadData();
    }
  }, [user, checkingUser]);

  // Use with Assistant
  function handleUseWithAssistant(t: Template) {
    if (typeof window === "undefined") return;

    const safeTitle = t.title || (t as any).name || "this template";
    const safePrompt = t.ai_prompt || (t as any).prompt || "";

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

  // Local filtering
  const filteredTemplates = templates.filter((t) => {
    // search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const combined = [
        t.title || "",
        t.description || "",
        t.category || "",
        t.ai_prompt || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!combined.includes(q)) return false;
    }

    // category filter
    if (categoryFilter !== "all") {
      if ((t.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

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
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                AI Templates
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Reusable prompts for planning, focus, study, and writing. Use
                them with the assistant in one click.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
              >
                <option value="all">All categories</option>
                <option value="Planning">Planning</option>
                <option value="Study">Study</option>
                <option value="Writing">Writing</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {loading ? (
            <p className="text-slate-300 text-sm">Loading templates…</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-slate-300 text-sm">
              No templates match this filter yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTemplates.map((t) => {
                const isMine = user && t.user_id === user.id;
                const isProTemplate = !!t.is_pro_only;
                const isProUser = plan === "pro";
                const locked = isProTemplate && !isProUser && !isMine;

                return (
                  <article
                    key={t.id}
                    className="border border-slate-800 rounded-2xl bg-slate-900/60 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="text-sm font-semibold">
                          {t.title || "Untitled template"}
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">
                          {t.category || "Uncategorized"}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-300 line-clamp-3 mb-2">
                        {t.description ||
                          "No description yet. Edit this template to add more context."}
                      </p>
                      <p className="text-[11px] text-slate-500 mb-1">
                        {t.is_public ? "Public" : "Private"}
                        {isMine ? " • Yours" : ""}
                        {isProTemplate && (
                          <span className="ml-1 text-amber-300">
                            • Pro template
                          </span>
                        )}
                        {typeof t.usage_count === "number" &&
                          t.usage_count > 0 && (
                            <>
                              {" "}
                              • Used {t.usage_count} time
                              {t.usage_count === 1 ? "" : "s"}
                            </>
                          )}
                      </p>
                      {locked && (
                        <p className="text-[11px] text-amber-300">
                          This is a Pro template. Upgrade to use it with the AI
                          assistant and unlock full access.
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      {/* Use with Assistant (locked if Pro + not Pro user + not owner) */}
                      <button
                        onClick={() => {
                          if (locked) {
                            // hard lock, just like you wanted
                            return;
                          }
                          handleUseWithAssistant(t);
                        }}
                        disabled={locked}
                        className={`text-xs px-3 py-1 rounded-lg border border-slate-700 ${
                          locked
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-slate-900"
                        }`}
                      >
                        🤖 Use with Assistant
                      </button>

                      {/* View / edit (also locked for Pro templates if user is not Pro and not owner) */}
                      {locked ? (
                        <span className="text-[11px] px-3 py-1 rounded-lg border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed">
                          View / edit
                        </span>
                      ) : (
                        <Link
                          href={`/templates/${t.id}`}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300"
                        >
                          View / edit
                        </Link>
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
