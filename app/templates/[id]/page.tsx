// app/templates/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // ✅ Notes-style: build full keys
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`templates.${key}`, fallback);
  const cardT = (key: string, fallback: string) => rawT(`templateCard.${key}`, fallback);

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [plan, setPlan] = useState<PlanType>("free");

  const [tmpl, setTmpl] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Local editable fields (DB values – NOT translated)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isProOnly, setIsProOnly] = useState(false);

  // --- Helpers: i18n title/description with per-template keys ---

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
      rawT(
        "templates.card.noDescription",
        "No description yet. Edit this template to add more context."
      );
    const key = `templates.presets.${tpl.id}.description`;
    const translated = rawT(key, fallback);
    if (!translated || translated === key) return fallback;
    return translated;
  }

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
        const { data, error } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Template detail: plan load error", error);
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

  // 3) Load template by id
  useEffect(() => {
    async function loadTemplate() {
      if (!id) {
        setError(t("detail.error.notFound", "Template not found."));
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
          .eq("id", id)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Template detail: load error", error);
          setError(t("detail.error.loadFailed", "Failed to load template."));
          setTmpl(null);
        } else if (!data) {
          setError(t("detail.error.notFound", "Template not found."));
          setTmpl(null);
        } else {
          const tRow = data as Template;
          setTmpl(tRow);
          setTitle(tRow.title || "");
          setDescription(tRow.description || "");
          setAiPrompt(tRow.ai_prompt || "");
          setCategory(tRow.category || "");
          setIsPublic(!!tRow.is_public);
          setIsProOnly(!!tRow.is_pro_only);
        }
      } catch (err) {
        console.error(err);
        setError(t("detail.error.loadFailed", "Failed to load template."));
        setTmpl(null);
      } finally {
        setLoading(false);
      }
    }

    if (!checkingUser) loadTemplate();
  }, [id, checkingUser]);

  const isMine = !!(user && tmpl && tmpl.user_id === user.id);
  const isProTemplate = !!tmpl?.is_pro_only || isProOnly;
  const locked = !!tmpl && isProTemplate && !isProUser && !isMine;

  // 4) Use with Assistant (gated)
  function handleUseWithAssistant() {
    if (!tmpl) return;
    if (typeof window === "undefined") return;

    if (locked) {
      window.location.href = "/dashboard#pricing";
      return;
    }

    const safeTitle = getTemplateTitle(tmpl);
    const safePrompt = tmpl.ai_prompt || "";

    window.dispatchEvent(
      new CustomEvent("ai-assistant-context", {
        detail: {
          content: safePrompt || `Use this template: "${safeTitle}".`,
          hint: `Use this template: "${safeTitle}".`,
        },
      })
    );
  }

  // 5) Save (only owner)
  async function handleSave(e: FormEvent) {
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
        setError(t("detail.error.saveFailed", "Failed to save template."));
        return;
      }

      setSuccess(t("detail.success.updated", "Template updated."));
    } catch (err) {
      console.error(err);
      setError(t("detail.error.saveFailed", "Failed to save template."));
    } finally {
      setSaving(false);
    }
  }

  // 6) Delete (only owner)
  async function handleDelete() {
    if (!tmpl || !user || !isMine) return;

    if (!confirm(t("detail.delete.confirm", "Delete this template permanently?"))) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.from("templates").delete().eq("id", tmpl.id).eq("user_id", user.id);

      if (error) {
        console.error(error);
        setError(t("detail.error.deleteFailed", "Failed to delete template."));
        setDeleting(false);
        return;
      }

      router.push("/templates");
    } catch (err) {
      console.error(err);
      setError(t("detail.error.deleteFailed", "Failed to delete template."));
      setDeleting(false);
    }
  }

  if (checkingUser || loading) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">{t("detail.loadingTemplate", "Loading template…")}</p>
      </main>
    );
  }

  if (!tmpl) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="templates" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-sm">
          <p className="text-[var(--text-muted)] mb-3">{error || t("detail.error.notFound", "Template not found.")}</p>
          <Link
            href="/templates"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-sm"
          >
            {t("detail.backToTemplates", "Back to templates")}
          </Link>
        </div>
      </main>
    );
  }

  const createdAtLabel = tmpl.created_at ? new Date(tmpl.created_at).toLocaleString() : null;

  // ✅ use templateCard keys for status line
  const statusLabel = tmpl.is_public
    ? isProTemplate
      ? cardT("publicPro", "Public • Pro template")
      : cardT("public", "Public")
    : rawT("templates.card.private", "Private");

  const usedTimesLabel =
    typeof tmpl.usage_count === "number"
      ? cardT("usedTimes", `Used ${tmpl.usage_count} times`).replace("{{count}}", String(tmpl.usage_count))
      : "";

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="templates" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{getTemplateTitle(tmpl)}</h1>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {statusLabel}
                {usedTimesLabel ? ` • ${usedTimesLabel}` : ""}
                {createdAtLabel ? ` • ${t("detail.createdPrefix", "Created")} ${createdAtLabel}` : ""}
              </p>
              {getTemplateDescription(tmpl) ? (
                <p className="text-[12px] text-[var(--text-main)] mt-2">{getTemplateDescription(tmpl)}</p>
              ) : null}
            </div>

            <Link
              href="/templates"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              {t("detail.backToTemplates", "← Back to templates")}
            </Link>
          </div>

          {locked && (
            <div className="mb-4 rounded-xl border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              {t(
                "detail.lockedBanner",
                "This is a Pro template. You can preview it, but only Pro / Founder users (or the owner) can use it with the AI assistant."
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {success && <p className="text-xs text-emerald-400 mb-2">{success}</p>}

          {/* Use with Assistant */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleUseWithAssistant}
              disabled={locked}
              className={`px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--bg-elevated)]"
                }`}
            >
              {cardT("use", "🤖 Use with Assistant")}
            </button>

            {tmpl.is_public && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") return;
                  const url = `${window.location.origin}/templates/${tmpl.id}`;
                  navigator.clipboard.writeText(url).catch((err) => console.error("Copy link failed", err));
                }}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-elevated)]"
              >
                {cardT("copyLink", "🔗 Copy link")}
              </button>
            )}

            {locked && (
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard#pricing")}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 text-xs"
              >
                {t("detail.upgradeToPro", "Upgrade to Pro")}
              </button>
            )}
          </div>

          {/* Edit / View form */}
          <section className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
            <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">{t("detail.form.titleLabel", "Title")}</label>
                <input
                  type="text"
                  value={title}
                  disabled={!isMine}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t("detail.form.descriptionLabel", "Short description")}
                </label>
                <textarea
                  value={description}
                  disabled={!isMine}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[80px] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t("detail.form.promptLabel", "Underlying AI prompt")}
                </label>
                <textarea
                  value={aiPrompt}
                  disabled={!isMine}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm min-h-[140px] disabled:opacity-60"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {t("detail.form.promptHint", "This is what gets sent to the AI when you use this template.")}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {t("detail.form.categoryLabel", "Category")}
                  </label>
                  <input
                    type="text"
                    value={category}
                    disabled={!isMine}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm disabled:opacity-60"
                  />
                </div>

                <label className="flex items-center gap-2 text-[11px] text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    disabled={!isMine}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  />
                  <span>{t("detail.form.publicLabel", "Public template")}</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={isProOnly}
                    disabled={!isMine}
                    onChange={(e) => setIsProOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  />
                  <span>{t("detail.form.proOnlyLabel", "Pro only")}</span>
                </label>
              </div>

              {isMine && (
                <div className="flex flex-wrap gap-3 mt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-60 text-sm"
                  >
                    {saving ? t("detail.buttons.saving", "Saving...") : t("detail.buttons.saveChanges", "Save changes")}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl border border-red-500 text-red-400 hover:bg-red-900/20 text-sm disabled:opacity-60"
                  >
                    {deleting ? t("detail.buttons.deleting", "Deleting...") : t("detail.buttons.delete", "Delete template")}
                  </button>
                </div>
              )}

              {!isMine && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  {t("detail.viewOnlyHint", "You can view this template, but only the owner can edit or delete it.")}
                </p>
              )}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
