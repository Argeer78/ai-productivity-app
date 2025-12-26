"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  LANGUAGES,
  LS_PREF_LANG,
  type Language,
} from "@/lib/translateLanguages";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useT } from "@/lib/useT";
import { supabase } from "@/lib/supabaseClient";

type TranslationResponse = {
  translation?: string | string[];
  error?: string | null;
};

// 🔧 Normalize text so cache lookups match Supabase rows
function normalizeForCache(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TranslateWithAIButton() {
  const { t, tCommon } = useT("translate");

  // App UI language, used only as a hint for default target language
  const languageCtx = useLanguage();
  const uiLangCode = (languageCtx as any)?.lang || "en";

  const [open, setOpen] = useState(false);

  const [selectedLang, setSelectedLang] = useState<Language | null>(
    LANGUAGES.find((l) => l.region === "Popular") || LANGUAGES[0]
  );

  const [search, setSearch] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ user id (to count AI usage on server when OpenAI is called)
  const [userId, setUserId] = useState<string | null>(null);

  // modal measuring + drag
  const modalRef = useRef<HTMLDivElement | null>(null);

  // IMPORTANT: left is "center x" because we use translateX(-50%)
  const [position, setPosition] = useState<{ top: number; left: number }>(() => ({
    top: 96,
    left: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  }));

  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    top: number;
    left: number;
  } | null>(null);

  function clampToViewport(top: number, left: number) {
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const rect = modalRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 520;
    const h = rect?.height ?? 520;

    // keep some extra headroom so it doesn't tuck under browser chrome
    const minTop = Math.max(margin, 16);
    const maxTop = Math.max(minTop, vh - h - margin);

    // left is the "center x" because we use translateX(-50%)
    const minLeft = margin + w / 2;
    const maxLeft = Math.max(minLeft, vw - margin - w / 2);

    return {
      top: clamp(top, minTop, maxTop),
      left: clamp(left, minLeft, maxLeft),
    };
  }

  // ✅ Load user id once (used only to count usage if translation is a cache miss)
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUserId(data?.user?.id ?? null);
      } catch (err) {
        console.error("[translate] load user error", err);
        if (!cancelled) setUserId(null);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // initial language: LS_PREF_LANG → UI language → browser language
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLangCode = window.localStorage.getItem(LS_PREF_LANG);
      let lang: Language | null = null;

      if (savedLangCode) {
        lang =
          LANGUAGES.find(
            (l) => l.code.toLowerCase() === savedLangCode.toLowerCase()
          ) || null;
      }

      if (!lang && uiLangCode) {
        const uiBase = uiLangCode.split("-")[0].toLowerCase();
        lang = LANGUAGES.find((l) => l.code.toLowerCase() === uiBase) || null;
      }

      if (!lang && typeof navigator !== "undefined" && navigator.language) {
        const browserBase = navigator.language.split("-")[0].toLowerCase();
        lang =
          LANGUAGES.find((l) => l.code.toLowerCase() === browserBase) || null;
      }

      if (lang) setSelectedLang(lang);
    } catch (err) {
      console.error("[translate] load initial language error", err);
    }
  }, [uiLangCode]);

  // center modal on open (clamped so it doesn't hide under browser UI)
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rect = modalRef.current?.getBoundingClientRect();
      const h = rect?.height ?? 520;

      // aim near center, but keep enough top padding for browser chrome
      const desiredTop = Math.max(24, Math.min(140, (vh - h) / 2));
      const desiredLeft = vw / 2;

      setPosition(clampToViewport(desiredTop, desiredLeft));
    });
     
  }, [open]);

  function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      top: position.top,
      left: position.left,
    };
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const start = dragStartRef.current;
      if (!start) return;

      const nextTop = start.top + (e.clientY - start.y);
      const nextLeft = start.left + (e.clientX - start.x);

      setPosition(clampToViewport(nextTop, nextLeft));
    }

    function handleMouseUp() {
      setDragging(false);
      dragStartRef.current = null;
    }

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
     
  }, [dragging]);

  function handleOpen() {
    try {
      const selection = window.getSelection()?.toString().trim() || "";
      setSourceText(selection || "");
      setTranslatedText("");
      setErrorMsg("");
      setSearch("");
      setOpen(true);
    } catch (err) {
      console.error("[translate] open modal error", err);
      setSourceText("");
      setErrorMsg(t("networkError", "Could not read the page content."));
      setOpen(true);
    }
  }

  // ✅ ONLY: basic text translation
  async function handleTranslateText() {
    if (!selectedLang) return;

    const text = sourceText.trim();
    if (!text) {
      setErrorMsg(
        t("noTextToTranslate", "Please type or paste some text to translate.")
      );
      return;
    }

    setErrorMsg("");
    setLoading(true);
    setTranslatedText("");

    try {
      const normalized = normalizeForCache(text);

      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: normalized,
          targetLang: selectedLang.code,
          // ✅ send userId so server can count AI usage on cache-miss
          userId,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | TranslationResponse
        | null;

      if (!res.ok || !data) {
        if (res.status === 413) {
          setErrorMsg(
            t(
              "tooLong",
              "This text is too long for a single translation. Please split it into smaller chunks and try again."
            )
          );
          return;
        }
        if (res.status === 429) {
          setErrorMsg(
            (data as any)?.error ||
              t(
                "rateLimited",
                "AI translation is temporarily rate-limited. Please try again in a few seconds."
              )
          );
          return;
        }

        console.error("[translate-text] server error", res.status, data);
        setErrorMsg(
          (data as any)?.error ||
            t("failedGeneric", `Failed to translate (status ${res.status}).`)
        );
        return;
      }

      if (Array.isArray(data.translation)) {
        setTranslatedText(data.translation.join("\n\n----------------\n\n"));
      } else {
        setTranslatedText((data.translation as string) || "");
      }
    } catch (err) {
      console.error("[translate-text] fetch error", err);
      setErrorMsg(
        t("networkError", "Network error while calling translation API.")
      );
    } finally {
      setLoading(false);
    }
  }

  // language helpers
  const popularLanguages = LANGUAGES.filter((l) => l.region === "Popular").sort(
    (a, b) => a.label.localeCompare(b.label)
  );

  const searchTerm = search.trim().toLowerCase();

  const filteredLanguages = searchTerm
    ? LANGUAGES.filter(
        (l) =>
          l.label.toLowerCase().includes(searchTerm) ||
          l.code.toLowerCase().includes(searchTerm)
      ).sort((a, b) => a.label.localeCompare(b.label))
    : null;

  const allNonPopular = LANGUAGES.filter((l) => l.region !== "Popular").sort(
    (a, b) => a.label.localeCompare(b.label)
  );

  const languagesToShow = filteredLanguages ?? allNonPopular;

  function renderLangButton(lang: Language) {
    const isSelected =
      selectedLang?.code === lang.code && selectedLang?.label === lang.label;

    return (
      <button
        key={`${lang.code}-${lang.label}`}
        type="button"
        onClick={() => {
          setSelectedLang(lang);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LS_PREF_LANG, lang.code);
          }
        }}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[12px] ${
          isSelected
            ? "bg-indigo-600 text-white"
            : "text-[var(--text-main)] hover:bg-[var(--bg-elevated)]"
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">{lang.code}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-card) 60%,transparent)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
      >
        <span>🌎 {tCommon("translateWithAI", "Translate with AI")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/50">
          <div
            ref={modalRef}
            data-translate-modal="1"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: "translateX(-50%)",
            }}
            className="w-[95%] max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl"
          >
            {/* Header (draggable) */}
            <div
              onMouseDown={startDrag}
              className="cursor-move flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] rounded-t-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🌎</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    {t("title", "Translate with AI")}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {t("subtitle", "Select your language and translate text.")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                {tCommon("close", "Close")}
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3 text-xs">
              {/* Language picker */}
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t("targetLanguage", "Target language")}
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    "searchLanguagePlaceholder",
                    "Search language (e.g. Spanish, 日本語, Português)…"
                  )}
                  className="w-full px-3 py-2 mb-2 rounded-xl bg-[var(--bg-body)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-main)]"
                />

                <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] p-2 space-y-2">
                  {!filteredLanguages && popularLanguages.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <span className="text-[10px] text-amber-300">⭐</span>
                        <span className="text-[10px] font-semibold text-[var(--text-main)]">
                          {t("popularLabel", "Most popular")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {popularLanguages.map((lang) => renderLangButton(lang))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {languagesToShow.map((lang) => renderLangButton(lang))}
                  </div>

                  {filteredLanguages && filteredLanguages.length === 0 && (
                    <p className="text-[11px] text-[var(--text-muted)] px-1">
                      {t(
                        "noLanguagesFound",
                        `No languages found for “${search}”.`
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Text to translate */}
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  {t("textToTranslate", "Text to translate")}
                </label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={t(
                    "textPlaceholder",
                    "Type or paste text, or select text on the page before opening."
                  )}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] p-2 max-h-32 min-h-[80px] text-[11px] text-[var(--text-main)] resize-vertical"
                />
              </div>

              {errorMsg && (
                <p className="text-[11px] text-red-400">{errorMsg}</p>
              )}

              {/* Actions (ONLY translate text) */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTranslateText}
                  disabled={loading || !selectedLang}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium text-white disabled:opacity-60"
                >
                  {loading
                    ? t("translating", "Translating…")
                    : t("translateText", "Translate text")}
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
                >
                  {tCommon("close", "Close")}
                </button>
              </div>

              {/* Result */}
              {translatedText && (
                <div className="mt-2">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    {t("translationResult", "Translation")}
                  </p>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 90%,transparent)] p-2 max-h-52 overflow-y-auto text-[11px] text-[var(--text-main)] whitespace-pre-wrap">
                    {translatedText}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* click outside to close */}
          <button
            type="button"
            aria-label="Close translate modal"
            onClick={() => setOpen(false)}
            className="absolute inset-0 w-full h-full cursor-default"
            style={{ background: "transparent" }}
          />
        </div>
      )}
    </>
  );
}
