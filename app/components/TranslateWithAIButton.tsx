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

/* -------------------------------------------------------
   Normalization so Supabase cache keys match every time
------------------------------------------------------- */
function normalizeForCache(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------
   Global hard caps for page translate
------------------------------------------------------- */
const MAX_NODES_PER_PAGE = 20000;
const MAX_TOTAL_CHARS = 150000;

/* -------------------------------------------------------
   Per-batch limits
------------------------------------------------------- */
const MAX_BATCH_NODES = 60;
const MAX_BATCH_CHARS = 5000;
const CONCURRENCY = 2;

/* -------------------------------------------------------
   NEW patched acceptNode — filters out ALL non-visible,
   zero-size, hidden, or layout nodes so we don't send
   garbage strings to the API or cache.
------------------------------------------------------- */
function getTranslatableTextNodes(): Text[] {
  if (typeof document === "undefined") return [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        const parent = (node as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip translation modal
        if (parent.closest("[data-translate-modal='1']")) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip scripts etc.
        const tag = parent.tagName.toLowerCase();
        if (
          ["script", "style", "noscript", "textarea"].includes(tag) ||
          parent.closest("code, pre, kbd, svg")
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        const text = node.textContent || "";
        if (!text.trim()) return NodeFilter.FILTER_REJECT;

        // NEW — filter invisible or zero-size elements
        const rect = parent.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip elements that are visually hidden
        const style = window.getComputedStyle(parent);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
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

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function TranslateWithAIButton() {
  const pathname = usePathname();

  // UI language
  const languageCtx = useLanguage();
  const uiLangCode = languageCtx?.lang || "en";

  // modal + text state
  const [open, setOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | null>(
    LANGUAGES.find((l) => l.region === "Popular") || LANGUAGES[0]
  );
  const [search, setSearch] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* -------------------------------------------------------
     Dragging modal
  ------------------------------------------------------- */
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  /* -------------------------------------------------------
     Auto-translation tracking
  ------------------------------------------------------- */
  const [autoAppliedPath, setAutoAppliedPath] = useState<string | null>(null);

  /* -------------------------------------------------------
     Language initialization
  ------------------------------------------------------- */
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
        lang =
          LANGUAGES.find((l) => l.code.toLowerCase() === uiBase) || null;
      }

      if (!lang && navigator.language) {
        const browserBase = navigator.language.split("-")[0].toLowerCase();
        lang =
          LANGUAGES.find((l) => l.code.toLowerCase() === browserBase) ||
          null;
      }

      if (lang) setSelectedLang(lang);
    } catch (err) {
      console.error("[translate] language init error", err);
    }
  }, [uiLangCode]);

  /* -------------------------------------------------------
     Center modal when opened
  ------------------------------------------------------- */
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setPosition({
        top: window.innerHeight * 0.15,
        left: window.innerWidth / 2,
      });
    }
  }, [open]);
  /* -------------------------------------------------------
     Open modal (grab selected text if available)
  ------------------------------------------------------- */
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
      setErrorMsg("Could not read the page content.");
      setOpen(true);
    }
  }

  /* -------------------------------------------------------
     BASIC TEXT TRANSLATION
  ------------------------------------------------------- */
  async function handleTranslateText() {
    if (!selectedLang) return;
    if (!sourceText.trim()) {
      setErrorMsg("Please type or paste some text to translate.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    setTranslatedText("");

    try {
      const normalized = normalizeForCache(sourceText);

      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: normalized,
          targetLang: selectedLang.code,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | TranslationResponse
        | null;

      if (!res.ok || !data) {
        setErrorMsg(
          data?.error || `Failed to translate (status ${res.status}).`
        );
        return;
      }

      if (Array.isArray(data.translation)) {
        setTranslatedText(data.translation.join("\n\n----------------\n\n"));
      } else {
        setTranslatedText(data.translation || "");
      }
    } catch (err) {
      console.error("[translate-text] fetch error", err);
      setErrorMsg("Network error while calling translation API.");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     FULL PAGE TRANSLATION — BATCHED — SUPABASE-CACHED
  ------------------------------------------------------- */
  async function translatePageWithLang(
    lang: Language,
    opts?: { auto?: boolean }
  ) {
    setErrorMsg("");
    setTranslatedText("Preparing page for translation…");
    setLoading(true);

    try {
      const allNodes = getTranslatableTextNodes();

      if (!allNodes.length) {
        setErrorMsg("No text found on this page to translate.");
        setLoading(false);
        return;
      }

      console.log("[DEBUG] Total raw text nodes found:", allNodes.length);
      allNodes.slice(0, 50).forEach((n, i) => {
        console.log(`[NODE ${i}]`, JSON.stringify(n.textContent));
      });

      /* -----------------------------
         GLOBAL LIMITS
      ----------------------------- */
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
        setErrorMsg("There was nothing suitable to translate on this page.");
        setLoading(false);
        return;
      }

      const totalSnippets = selectedNodes.length;
      const totalChars = selectedNodes.reduce(
        (sum, n) => sum + (n.textContent?.length || 0),
        0
      );

      /* -----------------------------
         BUILD BATCHES
      ----------------------------- */
      type Batch = { nodes: Text[]; charCount: number };
      const batches: Batch[] = [];

      let currentNodes: Text[] = [];
      let currentChars = 0;

      for (const node of selectedNodes) {
        const text = node.textContent || "";
        const len = text.length;

        const exceedsNodeLimit =
          currentNodes.length >= MAX_BATCH_NODES && currentNodes.length > 0;
        const exceedsCharLimit =
          currentChars + len > MAX_BATCH_CHARS && currentChars > 0;

        if (exceedsNodeLimit || exceedsCharLimit) {
          batches.push({ nodes: currentNodes, charCount: currentChars });
          currentNodes = [];
          currentChars = 0;
        }

        currentNodes.push(node);
        currentChars += len;
      }

      if (currentNodes.length) {
        batches.push({ nodes: currentNodes, charCount: currentChars });
      }

      if (!batches.length) {
        setErrorMsg("Nothing to translate.");
        setLoading(false);
        return;
      }

      /* -----------------------------
         BATCH PROCESSOR—CACHE FRIENDLY
      ----------------------------- */
      async function processBatch(batch: Batch) {
        const rawTexts = batch.nodes.map((n) => n.textContent || "");
        const texts = rawTexts.map((t) => normalizeForCache(t));

        // Remove only empty items
        const filteredNodes: Text[] = [];
        const filteredTexts: string[] = [];

        for (let i = 0; i < texts.length; i++) {
          if (!texts[i].trim()) continue;
          filteredNodes.push(batch.nodes[i]);
          filteredTexts.push(texts[i]);
        }

        if (filteredTexts.length === 0) {
          return { snippets: 0, chars: 0 };
        }

        const res = await fetch("/api/ai-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: filteredTexts,
            targetLang: lang.code,
          }),
        });

        const data = (await res.json().catch(() => null)) as
          | { translation?: string[] | string; error?: string }
          | null;

        if (!res.ok || !data?.translation) {
          throw new Error(data?.error || "Batch translation failed");
        }

        const translatedArray = Array.isArray(data.translation)
          ? data.translation
          : filteredTexts;

        // APPLY TRANSLATION TO DOM
        for (let j = 0; j < translatedArray.length; j++) {
          const node = filteredNodes[j];
          const text = translatedArray[j] || node.textContent || "";
          node.textContent = text;
        }

        return {
          snippets: filteredTexts.length,
          chars: batch.charCount,
        };
      }

      /* -----------------------------
         PROCESS BATCHES WITH CONCURRENCY
      ----------------------------- */
      let translatedSnippets = 0;
      let translatedChars = 0;

      for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const slice = batches.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(
          slice.map((batch) => processBatch(batch))
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            translatedSnippets += r.value.snippets;
            translatedChars += r.value.chars;
          } else {
            console.error("[translate-page] batch failed", r.reason);
            setErrorMsg(
              "Some parts of the page could not be translated. You can retry."
            );
          }
        }

        setTranslatedText(
          `Translated ${translatedSnippets}/${totalSnippets} snippets (~${translatedChars} chars) to ${lang.label}…`
        );
      }

      /* -----------------------------
         SAVE USER PREFERENCES
      ----------------------------- */
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PREF_LANG, lang.code);
        window.localStorage.setItem(LS_LAST_PATH, pathname || "");

        if (opts?.auto) {
          window.localStorage.setItem(LS_AUTO_MODE, "1");
        }
      }

      setAutoAppliedPath(pathname || "");
    } catch (err) {
      console.error("[translate-page] error", err);
      setErrorMsg("Network error while translating the page.");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     BUTTON ACTIONS
  ------------------------------------------------------- */
  function handleTranslatePage() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: false });
  }

  function handleTranslateSite() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: true });
  }

  /* -------------------------------------------------------
     AUTO-APPLY TRANSLATION ON NAVIGATION
  ------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    try {
      const autoMode = window.localStorage.getItem(LS_AUTO_MODE);
      if (autoMode !== "1") return;

      const savedLangCode = window.localStorage.getItem(LS_PREF_LANG);
      if (!savedLangCode) return;

      if (autoAppliedPath === pathname) return;

      const lang =
        LANGUAGES.find(
          (l) => l.code.toLowerCase() === savedLangCode.toLowerCase()
        ) || null;

      if (!lang) return;

      setSelectedLang(lang);
      translatePageWithLang(lang, { auto: true });
    } catch (err) {
      console.error("[translate-auto] error", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* -------------------------------------------------------
     DRAG HANDLERS
  ------------------------------------------------------- */
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

      setPosition((prev) => ({
        top: prev.top + (e.clientY - start.y),
        left: prev.left + (e.clientX - start.x),
      }));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }

    function up() {
      setDragging(false);
      dragStartRef.current = null;
    }

    if (dragging) {
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    }

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging]);
  /* -------------------------------------------------------
     LANGUAGE PICKER HELPERS
  ------------------------------------------------------- */
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

  const groupedByRegion =
    !filteredLanguages
      ? (REGION_ORDER.map((region) => {
          const items = LANGUAGES.filter(
            (l) => l.region === region
          ).sort((a, b) => a.label.localeCompare(b.label));

          if (!items.length) return null;
          return { region, items };
        }).filter(Boolean) as { region: string; items: Language[] }[])
      : [];

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <>
      {/* Main button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-card) 60%,transparent)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
      >
        🌎 Translate with AI
      </button>

      {/* Modal */}
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

                {/* Language results */}
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
                      {/* Popular languages */}
                      {popularLanguages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-1 px-1">
                            <span className="text-[10px] text-amber-300">⭐</span>
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
                                    window.localStorage.setItem(
                                      LS_PREF_LANG,
                                      lang.code
                                    );
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

                      {/* Regions */}
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
                                    window.localStorage.setItem(
                                      LS_PREF_LANG,
                                      lang.code
                                    );
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

              {/* Text input */}
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

              {/* Error message */}
              {errorMsg && (
                <p className="text-[11px] text-red-400">{errorMsg}</p>
              )}

              {/* Action buttons */}
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

              {/* Translation status output */}
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
