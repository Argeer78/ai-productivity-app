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
  usage_count: number | null;
  created_at: string | null;
};

type PlanType = "free" | "pro" | "founder";

export default function TemplatesPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<PlanType>("free");

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

        if (data?.plan === "pro" || data?.plan === "founder") {
          setPlan(data.plan as PlanType);
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadPlan();
  }, [user]);

  const isProUser = plan === "pro" || plan === "founder";

  // Load templates (both public + mine if logged in)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        let query = supabase
          .from("templates")
          .select(
            "id, user_id, title, description, ai_prompt, category, is_public, is_pro_only, usage_count, created_at"
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

  // Use with Assistant (now increments usage_count)
  async function handleUseWithAssistant(t: Template) {
    if (typeof window === "undefined") return;

    const safeTitle = t.title || (t as any).name || "this template";
    const safePrompt = t.ai_prompt || (t as any).prompt || "";

    // Send to global assistant
    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: safePrompt || `Use this template: "${safeTitle}".`,
          hint: `Use this template: "${safeTitle}". I may add extra details before sending.`,
        },
      })
    );

    // Increment usage_count in Supabase (best-effort, don't block UX)
    const newCount = (t.usage_count ?? 0) + 1;

    try {
      const { error } = await supabase
        .from("templates")
        .update({ usage_count: newCount })
        .eq("id", t.id);

      if (error) {
        console.error("Templates: failed to increment usage_count", error);
      } else {
        // Update local state so UI reflects new count
        setTemplates((prev) =>
          prev.map((tpl) =>
            tpl.id === t.id ? { ...tpl, usage_count: newCount } : tpl
          )
        );
      }
    } catch (err) {
      console.error("Templates: usage_count increment error", err);
    }
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

  // Trending public templates (top by usage_count)
  const trendingTemplates = [...templates]
    .filter((t) => t.is_public && (t.usage_count ?? 0) > 0)
    .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
    .slice(0, 5);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          Checking your session...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="templates" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                AI Templates
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Reusable prompts for planning, focus, study, and writing. Use
                them with the assistant in one click.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* How to use templates */}
          <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-[11px] md:text-xs text-[var(--text-main)]">
            <h2 className="font-semibold text-xs md:text-sm mb-1.5">
              How to use these templates
            </h2>
            <ul className="list-disc pl-4 space-y-1 text-[var(--text-muted)]">
              <li>
                <span className="font-semibold">Browse or search</span> for a
                template by category (Planning, Study, Writing, Work, Personal).
              </li>
              <li>
                Click{" "}
                <span className="font-semibold">“🤖 Use with Assistant”</span> to
                send the template into the AI Hub Chat. You can tweak the text
                or add extra details before you hit send.
              </li>
              <li>
                Click <span className="font-semibold">“View / edit”</span> to
                open the full template, see the exact prompt, and customize it
                for your own workflow.
              </li>
              <li>
                Templates marked{" "}
                <span className="font-semibold text-[var(--accent)]">Pro</span> are
                available for Pro / Founder users (or if it&apos;s a template
                you created yourself).
              </li>
              <li>
                The more you use a template, the higher it moves in{" "}
                <span className="font-semibold">“Trending public templates”</span>{" "}
                on the right side.
              </li>
            </ul>
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
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:outline-none text-sm"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
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

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          {loading ? (
            <p className="text-[var(--text-muted)] text-sm">
              Loading templates…
            </p>
          ) : (
            <div className="grid md:grid-cols-[2fr,1fr] gap-6">
              {/* Main templates grid */}
              <div>
                {filteredTemplates.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">
                    No templates match this filter yet.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredTemplates.map((t) => {
                      const isMine = user && t.user_id === user.id;
                      const isProTemplate = !!t.is_pro_only;
                      const locked = isProTemplate && !isProUser && !isMine;

                      return (
                        <article
                          key={t.id}
                          className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h2 className="text-sm font-semibold">
                                {t.title || "Untitled template"}
                              </h2>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                {t.category || "Uncategorized"}
                              </span>
                            </div>
                            <p className="text-[12px] text-[var(--text-main)] line-clamp-3 mb-2">
                              {t.description ||
                                "No description yet. Edit this template to add more context."}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] mb-1">
                              {t.is_public ? "Public" : "Private"}
                              {isMine ? " • Yours" : ""}
                              {isProTemplate && (
                                <span className="ml-1 text-[var(--accent)]">
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
                              <p className="text-[11px] text-[var(--accent)]">
                                This is a Pro template. Upgrade to use it with
                                the AI assistant and unlock full access.
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <button
                              onClick={() => {
                                if (locked) return;
                                handleUseWithAssistant(t);
                              }}
                              disabled={locked}
                              className={`text-xs px-3 py-1 rounded-lg border border-[var(--border-subtle)] ${
                                locked
                                  ? "opacity-60 cursor-not-allowed"
                                  : "hover:bg-[var(--bg-elevated)]"
                              }`}
                            >
                              🤖 Use with Assistant
                            </button>

                            {locked ? (
                              <span className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed">
                                View / edit
                              </span>
                            ) : (
                              <Link
                                href={`/templates/${t.id}`}
                                className="text-[11px] text-[var(--accent)] hover:opacity-80"
                              >
                                View / edit
                              </Link>
                            )}

                            {t.is_public && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window === "undefined") return;
                                  const url = `${window.location.origin}/templates/${t.id}`;
                                  navigator.clipboard
                                    .writeText(url)
                                    .catch((err) =>
                                      console.error(
                                        "Failed to copy template URL",
                                        err
                                      )
                                    );
                                }}
                                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                              >
                                🔗 Copy link
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Trending sidebar */}
              <aside className="space-y-3">
                <div className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-2">
                    🔥 Trending public templates
                  </h3>
                  {trendingTemplates.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      When templates are used with the assistant, they&apos;ll
                      show up here.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-[12px]">
                      {trendingTemplates.map((t) => {
                        const isProTemplate = !!t.is_pro_only;
                        const isMine = user && t.user_id === user.id;
                        const locked = isProTemplate && !isProUser && !isMine;

                        return (
                          <li
                            key={t.id}
                            className="flex flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-[12px]">
                                  {t.title || "Untitled template"}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  {t.category || "Uncategorized"} • Used{" "}
                                  {t.usage_count ?? 0} time
                                  {t.usage_count === 1 ? "" : "s"}
                                </p>
                              </div>
                              {isProTemplate && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--accent)] text-[var(--accent)]">
                                  Pro
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (locked) return;
                                  handleUseWithAssistant(t);
                                }}
                                disabled={locked}
                                className={`px-2 py-1 rounded-lg border border-[var(--border-subtle)] ${
                                  locked
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-[var(--bg-card)]"
                                }`}
                              >
                                🤖 Use
                              </button>
                              {!locked && (
                                <Link
                                  href={`/templates/${t.id}`}
                                  className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"
                                >
                                  View
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Make one of your templates public and use it often to push it
                  into the trending list.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
