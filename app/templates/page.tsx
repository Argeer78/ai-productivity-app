// app/templates/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

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
  // ✅ Notes-style: build full keys for both namespaces
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`templates.${key}`, fallback);
  const cardT = (key: string, fallback: string) => rawT(`templateCard.${key}`, fallback);

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<PlanType>("free");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  function getTemplateTitle(tpl: Template): string {
    const fallback = tpl.title || rawT("templates.card.untitled", "Untitled template");
    const key = `templates.presets.${tpl.id}.title`;
    const translated = rawT(key, fallback);
    if (!translated || translated === key) return fallback;
    return translated;
  }

  function getTemplateDescription(tpl: Template): string {
    const fallback =
      tpl.description ||
      rawT("templates.card.noDescription", "No description yet. Edit this template to add more context.");
    const key = `templates.presets.${tpl.id}.description`;
    const translated = rawT(key, fallback);
    if (!translated || translated === key) return fallback;
    return translated;
  }

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
        const { data, error } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();

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
          .select("id, user_id, title, description, ai_prompt, category, is_public, is_pro_only, usage_count, created_at");

        if (user) {
          query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
        } else {
          query = query.eq("is_public", true);
        }

        const { data, error: tmplError } = await query.order("created_at", { ascending: false });

        if (tmplError && (tmplError as any).code !== "PGRST116") {
          console.error("Templates: templates load error", tmplError);
          setTemplates([]);
        } else {
          setTemplates((data || []) as Template[]);
        }
      } catch (err) {
        console.error(err);
        setError(t("error.loadFailed", "Failed to load templates."));
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    if (!checkingUser) loadData();
  }, [user, checkingUser]);

  async function handleUseWithAssistant(tpl: Template) {
    if (typeof window === "undefined") return;

    const safeTitle = getTemplateTitle(tpl);
    const safePrompt = tpl.ai_prompt || (tpl as any).prompt || "";

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: safePrompt || `Use this template: "${safeTitle}".`,
          hint: `Use this template: "${safeTitle}". I may add extra details before sending.`,
        },
      })
    );

    const newCount = (tpl.usage_count ?? 0) + 1;

    try {
      const { error } = await supabase.from("templates").update({ usage_count: newCount }).eq("id", tpl.id);

      if (error) {
        console.error("Templates: failed to increment usage_count", error);
      } else {
        setTemplates((prev) => prev.map((tItem) => (tItem.id === tpl.id ? { ...tItem, usage_count: newCount } : tItem)));
      }
    } catch (err) {
      console.error("Templates: usage_count increment error", err);
    }
  }

  const filteredTemplates = templates.filter((tpl) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const combined = [tpl.title || "", tpl.description || "", tpl.category || "", tpl.ai_prompt || ""].join(" ").toLowerCase();
      if (!combined.includes(q)) return false;
    }

    if (categoryFilter !== "all") {
      if ((tpl.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    return true;
  });

  const trendingTemplates = [...templates]
    .filter((tpl) => tpl.is_public && (tpl.usage_count ?? 0) > 0)
    .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
    .slice(0, 5);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">{t("checkingSession", "Checking your session...")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="templates" />
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Visual Header */}
          <div className="relative mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm overflow-hidden">

            <div className="flex-1 relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("title", "AI Templates")}</h1>
              <p className="text-sm text-[var(--text-muted)] max-w-lg leading-relaxed mb-4">
                {t("subtitle", "Reusable prompts for planning, study, and work. Click 'Use with Assistant' to instantly start a chat with specialized instructions.")}
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Study
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Work
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Writing
                </span>
              </div>
            </div>

            <div className="w-32 h-32 relative z-10 flex-shrink-0">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl" />
              <img src="/images/ai-creator-empty.png?v=1" alt="Templates" className="relative z-10 w-full h-full object-contain" />
            </div>

            <Link
              href="/dashboard"
              className="absolute top-6 right-6 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[10px] z-20"
            >
              {t("backToDashboard", "← Back")}
            </Link>

            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* How to use templates */}
          <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-[11px] md:text-xs text-[var(--text-main)]">
            <h2 className="font-semibold text-xs md:text-sm mb-1.5">{t("howToUse.title", "How to use these templates")}</h2>
            <ul className="list-disc pl-4 space-y-1 text-[var(--text-muted)]">
              <li>{t("howToUse.1", 'Browse or search for a template by category (Planning, Study, Writing, Work, Personal).')}</li>
              <li>{t("howToUse.2", 'Click "🤖 Use with Assistant" to send the template into the AI Hub Chat. You can tweak the text or add extra details before you hit send.')}</li>
              <li>{t("howToUse.3", 'Click "View / edit" to open the full template, see the exact prompt, and customize it for your own workflow.')}</li>
              <li>{t("howToUse.4", 'Templates marked "Pro" are available for Pro / Founder users (or if it\'s a template you created yourself).')}</li>
              <li>{t("howToUse.5", 'The more you use a template, the higher it moves in "Trending public templates" on the right side.')}</li>
            </ul>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t("search.placeholder", "Search templates...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:outline-none text-sm"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
              >
                <option value="all">{t("filter.all", "All categories")}</option>
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
            <p className="text-[var(--text-muted)] text-sm">{t("loading", "Loading templates…")}</p>
          ) : (
            <div className="grid md:grid-cols-[2fr,1fr] gap-6">
              {/* Main templates grid */}
              <div>
                {filteredTemplates.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">{t("emptyFiltered", "No templates match this filter yet.")}</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredTemplates.map((tpl) => {
                      const isMine = user && tpl.user_id === user.id;
                      const isProTemplate = !!tpl.is_pro_only;
                      const locked = isProTemplate && !isProUser && !isMine;

                      return (
                        <article
                          key={tpl.id}
                          className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h2 className="text-sm font-semibold">{getTemplateTitle(tpl)}</h2>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                {tpl.category || "—"}
                              </span>
                            </div>

                            <p className="text-[12px] text-[var(--text-main)] line-clamp-3 mb-2">{getTemplateDescription(tpl)}</p>

                            <p className="text-[11px] text-[var(--text-muted)] mb-1">
                              {tpl.is_public
                                ? isProTemplate
                                  ? cardT("publicPro", "Public • Pro template")
                                  : cardT("public", "Public")
                                : rawT("templates.card.private", "Private")}

                              {typeof tpl.usage_count === "number" && tpl.usage_count > 0 && (
                                <>
                                  {" "}
                                  • {cardT("usedTimes", `Used ${tpl.usage_count} times`).replace("{{count}}", String(tpl.usage_count))}
                                </>
                              )}
                            </p>

                            {locked && (
                              <p className="text-[11px] text-[var(--accent)]">
                                {rawT(
                                  "templates.card.lockedMessage",
                                  "This is a Pro template."
                                )}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <button
                              onClick={() => {
                                if (locked) return;
                                handleUseWithAssistant(tpl);
                              }}
                              disabled={locked}
                              className={`text-xs px-3 py-1 rounded-lg border border-[var(--border-subtle)] ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--bg-elevated)]"
                                }`}
                            >
                              {cardT("use", "🤖 Use with Assistant")}
                            </button>

                            {locked ? (
                              <span className="text-[11px] px-3 py-1 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed">
                                {cardT("viewEdit", "View / edit")}
                              </span>
                            ) : (
                              <Link href={`/templates/${tpl.id}`} className="text-[11px] text-[var(--accent)] hover:opacity-80">
                                {cardT("viewEdit", "View / edit")}
                              </Link>
                            )}

                            {tpl.is_public && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window === "undefined") return;
                                  const url = `${window.location.origin}/templates/${tpl.id}`;
                                  navigator.clipboard.writeText(url).catch((err) => console.error("Failed to copy template URL", err));
                                }}
                                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                              >
                                {cardT("copyLink", "🔗 Copy link")}
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
                  <h3 className="text-sm font-semibold mb-2">{t("trending.title", "🔥 Trending public templates")}</h3>

                  {trendingTemplates.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {rawT("templates.trending.empty", "When templates are used with the assistant, they’ll show up here.")}
                    </p>
                  ) : (
                    <ul className="space-y-2 text-[12px]">
                      {trendingTemplates.map((tpl) => {
                        const isProTemplate = !!tpl.is_pro_only;
                        const isMine = user && tpl.user_id === user.id;
                        const locked = isProTemplate && !isProUser && !isMine;

                        return (
                          <li
                            key={tpl.id}
                            className="flex flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-[12px]">{getTemplateTitle(tpl)}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  {tpl.category || "—"} •{" "}
                                  {cardT("usedTimes", `Used ${tpl.usage_count ?? 0} times`).replace("{{count}}", String(tpl.usage_count ?? 0))}
                                </p>
                              </div>

                              {isProTemplate && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--accent)] text-[var(--accent)]">
                                  {t("trending.pro", "Pro")}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (locked) return;
                                  handleUseWithAssistant(tpl);
                                }}
                                disabled={locked}
                                className={`px-2 py-1 rounded-lg border border-[var(--border-subtle)] ${locked ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--bg-card)]"
                                  }`}
                              >
                                {t("trending.use", "🤖 Use")}
                              </button>

                              {!locked && (
                                <Link
                                  href={`/templates/${tpl.id}`}
                                  className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]"
                                >
                                  {t("trending.view", "View")}
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">{t("trending.tip", "Make one of your templates public and use it often to push it into the trending list.")}</p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
