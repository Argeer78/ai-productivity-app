"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  LANGUAGES,
  REGION_ORDER,
  LS_PREF_LANG,
  LS_LAST_PATH,
  LS_AUTO_MODE,
  type Language,
} from "@/lib/translateLanguages";
import { useLanguage } from "@/app/components/LanguageProvider";

type TranslationResponse = {
  translation?: string | string[];
  error?: string | null;
};

// ---------- NORMALIZATION FIX (CRITICAL) ----------
function normalizeForCache(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
// -----------------------------------------------------

// Hard limits
const MAX_NODES_PER_PAGE = 2000;
const MAX_TOTAL_CHARS = 150000;

const MAX_BATCH_NODES = 60;
const MAX_BATCH_CHARS = 5000;

const CONCURRENCY = 2;

// Collect translatable nodes
function getTranslatableTextNodes(): Text[] {
  if (typeof document === "undefined") return [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        const parent = (node as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        if (parent.closest("[data-translate-modal='1']"))
          return NodeFilter.FILTER_REJECT;

        const text = node.textContent || "";
        if (!text.trim()) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName.toLowerCase();
        if (
          ["script", "style", "noscript", "textarea"].includes(tag) ||
          parent.closest("code, pre, kbd, svg")
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    } as any
  );

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

export default function TranslateWithAIButton() {
  const pathname = usePathname();

  const languageCtx = useLanguage();
  const uiLangCode = languageCtx?.lang || "en";

  const [open, setOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | null>(
    LANGUAGES.find((l) => l.region === "Popular") || LANGUAGES[0]
  );
  const [search, setSearch] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [autoAppliedPath, setAutoAppliedPath] = useState<string | null>(null);

  // Load chosen language
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
        const uiBase = uiLangCode.split("-")[0];
        lang = LANGUAGES.find((l) => l.code === uiBase) || null;
      }

      if (!lang && typeof navigator !== "undefined") {
        const browserBase = navigator.language.split("-")[0];
        lang = LANGUAGES.find((l) => l.code === browserBase) || null;
      }

      if (lang) setSelectedLang(lang);
    } catch (err) {
      console.error("[translate] load language fail", err);
    }
  }, [uiLangCode]);

  // Center modal
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setPosition({
        top: window.innerHeight * 0.15,
        left: window.innerWidth / 2,
      });
    }
  }, [open]);

  function handleOpen() {
    try {
      const selection = window.getSelection()?.toString().trim() || "";
      setSourceText(selection);
      setTranslatedText("");
      setErrorMsg("");
      setSearch("");
      setOpen(true);
    } catch {
      setErrorMsg("Could not read page content.");
      setOpen(true);
    }
  }

  // ---------- TEXT TRANSLATION (manual) ----------
  async function handleTranslateText() {
    if (!selectedLang) return;
    if (!sourceText.trim()) {
      setErrorMsg("Enter text to translate.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    setTranslatedText("");

    try {
      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: normalizeForCache(sourceText), // <-- FIX
          targetLang: selectedLang.code,
        }),
      });

      const data = (await res.json().catch(() => null)) as TranslationResponse;

      if (!res.ok || !data) {
        setErrorMsg(data?.error || "Translation failed.");
        return;
      }

      setTranslatedText(
        Array.isArray(data.translation)
          ? data.translation.join("\n\n----------------\n\n")
          : data.translation || ""
      );
    } catch (err) {
      setErrorMsg("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- PAGE TRANSLATION ----------
  async function translatePageWithLang(lang: Language, opts?: { auto?: boolean }) {
    setErrorMsg("");
    setTranslatedText("Preparing page…");
    setLoading(true);

    try {
      const allNodes = getTranslatableTextNodes();
      if (!allNodes.length) {
        setErrorMsg("No text found.");
        setLoading(false);
        return;
      }

      const selectedNodes: Text[] = [];
      let globalChars = 0;

      for (const node of allNodes) {
        if (selectedNodes.length >= MAX_NODES_PER_PAGE) break;

        const text = node.textContent || "";
        const len = text.trim().length;

        if (globalChars + len > MAX_TOTAL_CHARS) break;

        selectedNodes.push(node);
        globalChars += len;
      }

      if (!selectedNodes.length) {
        setErrorMsg("Nothing to translate.");
        setLoading(false);
        return;
      }

      const totalSnippets = selectedNodes.length;

      // --- Build batches ---
      type Batch = { nodes: Text[]; charCount: number };
      const batches: Batch[] = [];
      let curr: Text[] = [];
      let currChars = 0;

      for (const node of selectedNodes) {
        const text = node.textContent || "";
        const len = text.length;

        if (
          (curr.length >= MAX_BATCH_NODES && curr.length > 0) ||
          (currChars + len > MAX_BATCH_CHARS && currChars > 0)
        ) {
          batches.push({ nodes: curr, charCount: currChars });
          curr = [];
          currChars = 0;
        }

        curr.push(node);
        currChars += len;
      }

      if (curr.length) batches.push({ nodes: curr, charCount: currChars });

      if (!batches.length) {
        setErrorMsg("No batches to translate.");
        setLoading(false);
        return;
      }

      let doneSnippets = 0;

      // ---------- FIXED BATCH PROCESSING ----------
      async function processBatch(batch: Batch) {
        const texts = batch.nodes.map((n) =>
          normalizeForCache(n.textContent || "")
        );

        const res = await fetch("/api/ai-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: texts, targetLang: lang.code }),
        });

        const data = (await res.json().catch(() => null)) as TranslationResponse;

        if (!res.ok || !data?.translation) {
          throw new Error(data?.error || "Translation failed.");
        }

        const translatedArray = Array.isArray(data.translation)
          ? data.translation
          : texts;

        // ---------- SAFE DOM UPDATE ----------
        const m = Math.min(translatedArray.length, batch.nodes.length);
        for (let i = 0; i < m; i++) {
          const translated = translatedArray[i];
          if (translated && translated.trim().length > 0) {
            batch.nodes[i].textContent = translated;
          }
        }

        return m;
      }

      // Run batches with concurrency
      for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const slice = batches.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(
          slice.map((b) => processBatch(b))
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            doneSnippets += r.value;
          }
        }

        setTranslatedText(
          `Translated ${doneSnippets}/${totalSnippets} snippets to ${lang.label}…`
        );
      }

      // Save settings
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PREF_LANG, lang.code);
        window.localStorage.setItem(LS_LAST_PATH, pathname || "");

        if (opts?.auto) window.localStorage.setItem(LS_AUTO_MODE, "1");
      }

      setAutoAppliedPath(pathname || "");
    } catch (err) {
      console.error("[translate-page] error", err);
      setErrorMsg("Page translation failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleTranslatePage() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: false });
  }

  function handleTranslateSite() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: true });
  }

  // Auto-apply on navigation
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    try {
      const auto = window.localStorage.getItem(LS_AUTO_MODE);
      if (auto !== "1") return;

      const savedCode = window.localStorage.getItem(LS_PREF_LANG);
      if (!savedCode) return;

      if (autoAppliedPath === pathname) return;

      const lang =
        LANGUAGES.find((l) => l.code === savedCode.toLowerCase()) || null;
      if (!lang) return;

      setSelectedLang(lang);
      translatePageWithLang(lang, { auto: true });
    } catch {}
  }, [pathname]);

  // Drag logic
  function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }

  useEffect(() => {
    function move(e: MouseEvent) {
      if (!dragging) return;
      const start = dragStartRef.current;
      if (!start) return;

      setPosition((p) => ({
        top: p.top + (e.clientY - start.y),
        left: p.left + (e.clientX - start.x),
      }));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }

    function stop() {
      setDragging(false);
      dragStartRef.current = null;
    }

    if (dragging) {
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", stop);
    }

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, [dragging]);

  // UI below (unchanged)
  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-card) 60%,transparent)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
      >
        🌎 Translate with AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div
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
              className="cursor-move flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] rounded-t-2xl"
              onMouseDown={startDrag}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🌎</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    Translate with AI
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Select your language and translate text or the page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3 text-xs">
              {/* Language picker */}
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Target language
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language (e.g. Spanish, 日本語, Português)…"
                  className="w-full px-3 py-2 mb-2 rounded-xl bg-[var(--bg-body)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-main)]"
                />

                <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] p-2 space-y-2">
                  {filteredLanguages ? (
                    filteredLanguages.length ? (
                      filteredLanguages.map((lang) => {
                        const isSelected =
                          selectedLang?.code === lang.code &&
                          selectedLang?.label === lang.label;
                        return (
                          <button
                            key={`${lang.code}-${lang.label}`}
                            type="button"
                            onClick={() => {
                              setSelectedLang(lang);
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem(
                                  LS_PREF_LANG,
                                  lang.code
                                );
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
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {lang.code}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)] px-1">
                        No languages found for “{search}”.
                      </p>
                    )
                  ) : (
                    <>
                      {popularLanguages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-1 px-1">
                            <span className="text-[10px] text-amber-300">
                              ⭐
                            </span>
                            <span className="text-[10px] font-semibold text-[var(--text-main)]">
                              Most popular
                            </span>
                          </div>
                          <div className="space-y-1 mb-2">
                            {popularLanguages.map((lang) => {
                              const isSelected =
                                selectedLang?.code === lang.code &&
                                selectedLang?.label === lang.label;
                              return (
                                <button
                                  key={`${lang.code}-${lang.label}-popular`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLang(lang);
                                    if (typeof window !== "undefined") {
                                      window.localStorage.setItem(
                                        LS_PREF_LANG,
                                        lang.code
                                      );
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
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {lang.code}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {groupedByRegion.map((group) => (
                        <div key={group.region}>
                          <p className="text-[10px] font-semibold text-[var(--text-muted)] px-1 mb-1">
                            {group.region}
                          </p>
                          <div className="space-y-1 mb-2">
                            {group.items.map((lang) => {
                              const isSelected =
                                selectedLang?.code === lang.code &&
                                selectedLang?.label === lang.label;
                              return (
                                <button
                                  key={`${lang.code}-${lang.label}-${group.region}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLang(lang);
                                    if (typeof window !== "undefined") {
                                      window.localStorage.setItem(
                                        LS_PREF_LANG,
                                        lang.code
                                      );
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
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {lang.code}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Text to translate */}
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Text to translate
                </label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Type or paste text, or select text on the page before opening."
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 80%,transparent)] p-2 max-h-32 min-h-[80px] text-[11px] text-[var(--text-main)] resize-vertical"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <p className="text-[11px] text-red-400">{errorMsg}</p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTranslateText}
                    disabled={loading || !selectedLang}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    {loading
                      ? "Translating…"
                      : `Translate text to ${selectedLang?.label ?? "…"}`}
                  </button>

                  <button
                    type="button"
                    onClick={handleTranslatePage}
                    disabled={loading || !selectedLang}
                    className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[11px] font-medium text-[var(--text-main)] disabled:opacity-60"
                  >
                    {loading ? "Working on page…" : "Translate this page"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTranslateSite}
                    disabled={loading || !selectedLang}
                    className="px-4 py-2 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    {loading
                      ? "Applying auto-translation…"
                      : "Auto-translate app"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
                >
                  Close
                </button>
              </div>

              {/* Result / status */}
              {translatedText && (
                <div className="mt-2">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">
                    Translation status
                  </p>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-body) 90%,transparent)] p-2 max-h-52 overflow-y-auto text-[11px] text-[var(--text-main)] whitespace-pre-wrap">
                    {translatedText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}