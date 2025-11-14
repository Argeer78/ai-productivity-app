// app/explore/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type Plan = "free" | "pro";

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

type SortOption = "trending" | "newest";

export default function ExplorePage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<Plan>("free");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [message, setMessage] = useState("");

  // 1) Load user (optional – page works even if not logged in)
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

  // 2) Load plan if logged in
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
          console.error("Explore: plan load error", error);
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

  // 3) Load public templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const { data, error } = await supabase
          .from("templates")
          .select(
            "id, user_id, title, description, ai_prompt, category, is_public, is_pro_only, usage_count, created_at"
          )
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        if (error && (error as any).code !== "PGRST116") {
          console.error("Explore: templates load error", error);
          setTemplates([]);
        } else {
          setTemplates((data || []) as Template[]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load public templates.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  // 4) Use with Assistant (respect Pro locking)
  async function handleUseWithAssistant(t: Template) {
    if (typeof window === "undefined") return;

    const isMine = user && t.user_id === user.id;
    const isProTemplate = !!t.is_pro_only;
    const isProUser = plan === "pro";
    const locked = isProTemplate && !isProUser && !isMine;

    if (locked) {
      window.location.href = "/dashboard#pricing";
      return;
    }

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

    // Optional: increment usage_count when used
    const newCount = (t.usage_count ?? 0) + 1;
    try {
      const { error } = await supabase
        .from("templates")
        .update({ usage_count: newCount })
        .eq("id", t.id);

      if (error) {
        console.error("Explore: increment usage_count error", error);
      } else {
        setTemplates((prev) =>
          prev.map((tpl) =>
            tpl.id === t.id ? { ...tpl, usage_count: newCount } : tpl
          )
        );
      }
    } catch (err) {
      console.error("Explore: usage_count increment failed", err);
    }
  }

  // 5) Copy template into user’s account
  async function handleCopyTemplate(t: Template) {
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
      return;
    }

    setMessage("");
    setError("");

    try {
      const { data, error } = await supabase
        .from("templates")
        .insert([
          {
            user_id: user.id,
            title: t.title,
            description: t.description,
            ai_prompt: t.ai_prompt,
            category: t.category,
            is_public: false, // copies start private
            is_pro_only: t.is_pro_only,
            usage_count: 0,
          },
        ])
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Explore: copy template error", error);
        setError("Failed to copy this template into your account.");
        return;
      }

      setMessage("Template copied! You can edit it from the Templates page.");
      if (data?.id && typeof window !== "undefined") {
        // optional: send them to their copy
        // window.location.href = `/templates/${data.id}`;
      }
    } catch (err) {
      console.error(err);
      setError("Failed to copy this template.");
    }
  }

  // 6) Local sorting & filtering
  const sortedFilteredTemplates = templates
    .filter((t) => {
      if (categoryFilter === "all") return true;
      return (
        (t.category || "").toLowerCase() === categoryFilter.toLowerCase()
      );
    })
    .sort((a, b) => {
      if (sortBy === "trending") {
        const ua = a.usage_count ?? 0;
        const ub = b.usage_count ?? 0;
        if (ub !== ua) return ub - ua;
        return (b.created_at || "").localeCompare(a.created_at || "");
      }
      // newest
      return (b.created_at || "").localeCompare(a.created_at || "");
    });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader active="explore" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Explore Templates
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                Browse public AI templates created for planning, focus, study,
                and writing. Use them with the assistant or copy them into your
                own workspace.
              </p>
            </div>
            <Link
              href="/templates"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs"
            >
              ← My templates
            </Link>
          </div>

          {/* Info note */}
          <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-[11px] text-slate-300">
            <p className="mb-1">
              Anyone can browse these templates. If you want to publish your
              own, make a template public from the Templates page.
            </p>
            {!user && (
              <p className="mt-1 text-slate-400">
                Log in to copy templates into your account and customize them.
              </p>
            )}
          </div>

          {/* Filters & sort */}
          <div className="mb-4 flex flex-wrap gap-3 items-center text-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as SortOption)
                }
                className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-700 text-[12px]"
              >
                <option value="trending">Trending</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-700 text-[12px]"
              >
                <option value="all">All</option>
                <option value="Planning">Planning</option>
                <option value="Study">Study</option>
                <option value="Writing">Writing</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          {message && (
            <p className="text-xs text-emerald-400 mb-3">{message}</p>
          )}

          {loading ? (
            <p className="text-slate-300 text-sm">
              Loading public templates…
            </p>
          ) : sortedFilteredTemplates.length === 0 ? (
            <p className="text-slate-300 text-sm">
              No public templates yet. Make some of your templates public from
              the Templates page.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {sortedFilteredTemplates.map((t) => {
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
                        Public template
                        {isProTemplate && (
                          <span className="ml-1 text-amber-300">
                            • Pro
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
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleUseWithAssistant(t)}
                        className={`px-3 py-1 rounded-lg border border-slate-700 ${
                          locked
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-slate-900"
                        }`}
                      >
                        {locked ? "🔒 Pro – Use with AI" : "🤖 Use with AI"}
                      </button>

                      <Link
                        href={`/templates/${t.id}`}
                        className="px-3 py-1 rounded-lg border border-slate-800 hover:bg-slate-900"
                      >
                        View details
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(t)}
                        className="px-3 py-1 rounded-lg border border-slate-800 hover:bg-slate-900"
                      >
                        📥 Copy to my templates
                      </button>

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
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        🔗 Copy share link
                      </button>
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
