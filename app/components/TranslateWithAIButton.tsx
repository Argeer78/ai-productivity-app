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

type TranslationResponse = {
  translation?: string;
  error?: string;
};

// Hard limits for page translation to control cost & speed
const MAX_NODES_PER_PAGE = 600;
const MAX_TOTAL_CHARS = 50000;

// Per-request batch limits (for progressive translation)
const MAX_BATCH_NODES = 60;
const MAX_BATCH_CHARS = 5000;

const CONCURRENCY = 2; // how many batches to process in parallel

// Collect text nodes, skipping the translation modal itself
function getTranslatableTextNodes(): Text[] {
  if (typeof document === "undefined") return [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        const parent = (node as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip modal
        if (parent.closest("[data-translate-modal='1']")) {
          return NodeFilter.FILTER_REJECT;
        }

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

  const [open, setOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | null>(
    LANGUAGES.find((l) => l.region === "Popular") || LANGUAGES[0]
  );
  const [search, setSearch] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // drag state
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // track where auto-translation was last applied
  const [autoAppliedPath, setAutoAppliedPath] = useState<string | null>(null);

  // cache: "langCode::originalText" -> translatedText
  const cacheRef = useRef<Map<string, string>>(new Map());

  // ----- initial language: saved or browser language -----
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

      if (!lang && typeof navigator !== "undefined" && navigator.language) {
        const browserBase = navigator.language.split("-")[0].toLowerCase();
        lang =
          LANGUAGES.find(
            (l) => l.code.toLowerCase() === browserBase
          ) || null;
      }

      if (lang) {
        setSelectedLang(lang);
      }
    } catch (err) {
      console.error("[translate] load initial language error", err);
    }
  }, []);

  // center modal when opening
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPosition({
        top: vh * 0.15,
        left: vw / 2,
      });
    }
  }, [open]);

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

  // ----- basic text translation -----
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
      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          targetLang: selectedLang.code,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | TranslationResponse
        | null;

      if (!res.ok || !data?.translation) {
        if (res.status === 413) {
          setErrorMsg(
            "This text is too long for a single translation. Please split it into smaller chunks and try again."
          );
          return;
        }
        if (res.status === 429) {
          setErrorMsg(
            data?.error ||
              "AI translation is temporarily rate-limited. Please try again in a few seconds."
          );
          return;
        }

        console.error("[translate-text] server error", res.status, data);
        setErrorMsg(
          data?.error || `Failed to translate (status ${res.status}).`
        );
        return;
      }

      setTranslatedText(data.translation);
    } catch (err) {
      console.error("[translate-text] fetch error", err);
      setErrorMsg("Network error while calling translation API.");
    } finally {
      setLoading(false);
    }
  }

  // ----- page translation (progressive chunks + cache + concurrency) -----
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

      // Use the entire page; rely on caps to limit cost
      const nodesToUse: Text[] = allNodes;

      // 2️⃣ Apply global caps (nodes + characters) + cache
      const selectedNodes: Text[] = [];
      let globalChars = 0;
      const langCode = lang.code.toLowerCase();

      for (const node of nodesToUse) {
        if (selectedNodes.length >= MAX_NODES_PER_PAGE) break;

        const original = node.textContent || "";
        const len = original.length;
        if (len < 3) continue;

        if (globalChars + len > MAX_TOTAL_CHARS) break;

        const cacheKey = `${langCode}::${original}`;
        const cached = cacheRef.current.get(cacheKey);

        if (cached) {
          // Instant translation from cache
          node.textContent = cached;
          continue;
        }

        selectedNodes.push(node);
        globalChars += len;
      }

      if (!selectedNodes.length) {
        setTranslatedText(
          `Used cached translations. Nothing new to translate for ${lang.label}.`
        );
        setLoading(false);
        return;
      }

      const totalSnippets = selectedNodes.length;
      const totalChars = selectedNodes.reduce(
        (sum, n) => sum + ((n.textContent || "").length || 0),
        0
      );

      // 3️⃣ Build batches
      type Batch = { nodes: Text[]; charCount: number };
      const batches: Batch[] = [];
      let currentNodes: Text[] = [];
      let currentChars = 0;

      for (const node of selectedNodes) {
        const text = node.textContent || "";
        const len = text.length;

        const wouldExceedNodes =
          currentNodes.length >= MAX_BATCH_NODES && currentNodes.length > 0;
        const wouldExceedChars =
          currentChars + len > MAX_BATCH_CHARS && currentChars > 0;

        if (wouldExceedNodes || wouldExceedChars) {
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
        setErrorMsg("There was nothing suitable to translate on this page.");
        setLoading(false);
        return;
      }

      let translatedSnippets = 0;
      let translatedChars = 0;

      async function processBatch(batch: Batch, batchIndex: number) {
        const texts = batch.nodes.map((n) => n.textContent || "");

        const res = await fetch("/api/ai-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: texts, // 👈 array, for server-side caching per snippet
            targetLang: lang.code,
          }),
        });

        const data = (await res.json().catch(() => null)) as
          | { translation?: string[]; error?: string }
          | null;

        if (!res.ok || !data?.translation) {
          if (res.status === 413) {
            console.warn("[translate-page] batch payload too long", data);
            throw new Error(
              "This page batch is very long and was skipped (413)."
            );
          }

          if (res.status === 429) {
            console.warn("[translate-page] rate limited", data);
            throw new Error(
              data?.error ||
                "AI translation is temporarily rate-limited for this batch."
            );
          }

          console.error("[translate-page] server error", res.status, data);
          throw new Error(
            data?.error ||
              `Failed to translate part of the page (status ${res.status}).`
          );
        }

        const translated = Array.isArray(data.translation)
          ? data.translation
          : texts;

        const m = Math.min(translated.length, batch.nodes.length);

        for (let j = 0; j < m; j++) {
          const node = batch.nodes[j];
          const original = node.textContent || "";
          const newText = translated[j] ?? original;

          node.textContent = newText;

          const cacheKey = `${langCode}::${original}`;
          cacheRef.current.set(cacheKey, newText);
        }

        return { snippets: m, chars: batch.charCount };
      }

      // 4️⃣ Process batches with small concurrency, applying each as we go
      for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const slice = batches.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(
          slice.map((batch, idx) => processBatch(batch, i + idx))
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            translatedSnippets += r.value.snippets;
            translatedChars += r.value.chars;
          } else {
            console.error("[translate-page] batch failed", r.reason);
            setErrorMsg(
              "Some parts of the page could not be translated. Please try again or reload."
            );
          }
        }

        setTranslatedText(
          `Translated ${translatedSnippets}/${totalSnippets} snippets (~${translatedChars} characters) to ${lang.label}…`
        );
      }

      // 5️⃣ Persist preference + auto-mode flag
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PREF_LANG, lang.code);
        window.localStorage.setItem(LS_LAST_PATH, window.location.pathname);

        if (opts?.auto) {
          window.localStorage.setItem(LS_AUTO_MODE, "1");
        }
      }

      // 6️⃣ Remember that we translated this path in this session
      if (pathname) {
        setAutoAppliedPath(pathname);
      }
    } catch (err) {
      console.error("[translate-page] error", err);
      if (!errorMsg) {
        setErrorMsg("Network error while translating the page.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleTranslatePage() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: false });
  }

  // “Translate AI Hub (auto)” – enable auto mode
  function handleTranslateSite() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: true });
  }

  // ----- auto-apply translation when navigating (auto-mode) -----
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    try {
      const autoMode = window.localStorage.getItem(LS_AUTO_MODE);
      if (autoMode !== "1") return;

      const savedLangCode = window.localStorage.getItem(LS_PREF_LANG);
      if (!savedLangCode) return;

      // avoid re-applying on the same page
      if (autoAppliedPath === pathname) return;

      const lang =
        LANGUAGES.find(
          (l) => l.code.toLowerCase() === savedLangCode.toLowerCase()
        ) || null;
      if (!lang) return;

      // keep UI in sync
      setSelectedLang(lang);

      // fire-and-forget translate – we don't block navigation on it
      translatePageWithLang(lang, { auto: true });
    } catch (err) {
      console.error("[translate-auto] error", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // depends on route changes only

  // ----- drag logic -----
  function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging) return;

      const start = dragStartRef.current;
      if (!start) return;

      setPosition((prev) => ({
        top: prev.top + (e.clientY - start.y),
        left: prev.left + (e.clientX - start.x),
      }));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
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

  // ----- language helpers -----
  const popularLanguages = LANGUAGES.filter(
    (l) => l.region === "Popular"
  ).sort((a, b) => a.label.localeCompare(b.label));

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
          const items = LANGUAGES
            .filter((l) => l.region === region)
            .sort((a, b) => a.label.localeCompare(b.label));

          if (!items.length) return null;

          return { region, items };
        }).filter((g) => g !== null) as { region: string; items: Language[] }[])
      : [];

  // ----- render -----
  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in srgb,var(--bg-card) 60%,transparent)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-main)]"
      >
        <span>🌎 Translate with AI</span>
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
                            onClick={() => setSelectedLang(lang)}
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
                      {/* Most popular */}
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
                                  onClick={() => setSelectedLang(lang)}
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
                                  onClick={() => setSelectedLang(lang)}
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

                  {/* 🔁 Auto-translate the whole app */}
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
