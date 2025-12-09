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

type TranslationResponse =
  | { translation: string; error?: string | null }
  | { translation: string[]; error?: string | null };

// Hard limits for page translation to control cost & speed
const MAX_NODES_PER_PAGE = 600;
const MAX_TOTAL_CHARS = 50000;

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

  // App UI language, used only as a *hint* for default target language
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

  // drag state
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // track where auto-translation was last applied
  const [autoAppliedPath, setAutoAppliedPath] = useState<string | null>(null);

  // 🔑 Remember the very first text of each node (the *true* original)
  const originalTextMapRef = useRef<WeakMap<Text, string>>(new WeakMap());

  // ----- initial language: LS_PREF_LANG → UI language → browser language -----
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLangCode = window.localStorage.getItem(LS_PREF_LANG);
      let lang: Language | null = null;

      // 1) Prefer saved manual choice (from Settings or previous selection)
      if (savedLangCode) {
        lang =
          LANGUAGES.find(
            (l) => l.code.toLowerCase() === savedLangCode.toLowerCase()
          ) || null;
      }

      // 2) If none, prefer app UI language
      if (!lang && uiLangCode) {
        const uiBase = uiLangCode.split("-")[0].toLowerCase();
        lang =
          LANGUAGES.find((l) => l.code.toLowerCase() === uiBase) || null;
      }

      // 3) Fallback to browser language
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
  }, [uiLangCode]);

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

      if (!res.ok || !data) {
        if (res.status === 413) {
          setErrorMsg(
            "This text is too long for a single translation. Please split it into smaller chunks and try again."
          );
          return;
        }
        if (res.status === 429) {
          setErrorMsg(
            (data as any)?.error ||
              "AI translation is temporarily rate-limited. Please try again in a few seconds."
          );
          return;
        }

        console.error("[translate-text] server error", res.status, data);
        setErrorMsg(
          (data as any)?.error || `Failed to translate (status ${res.status}).`
        );
        return;
      }

      if (Array.isArray((data as any).translation)) {
        setTranslatedText(
          (data as any).translation.join("\n\n----------------\n\n")
        );
      } else {
        setTranslatedText((data as any).translation || "");
      }
    } catch (err) {
      console.error("[translate-text] fetch error", err);
      setErrorMsg("Network error while calling translation API.");
    } finally {
      setLoading(false);
    }
  }

  // ----- page translation (simple, one request, uses true originals) -----
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

      // Remember original text of each node (only once)
      allNodes.forEach((node) => {
        if (!originalTextMapRef.current.has(node)) {
          originalTextMapRef.current.set(node, node.textContent || "");
        }
      });

      const selectedNodes: Text[] = [];
      let totalChars = 0;

      for (const node of allNodes) {
        if (selectedNodes.length >= MAX_NODES_PER_PAGE) break;

        const original =
          originalTextMapRef.current.get(node) ?? node.textContent ?? "";
        const trimmed = original.trim();
        const len = trimmed.length;
        if (len < 3) continue;

        if (totalChars + len > MAX_TOTAL_CHARS) break;

        selectedNodes.push(node);
        totalChars += len;
      }

      if (!selectedNodes.length) {
        setErrorMsg("There was nothing suitable to translate on this page.");
        setLoading(false);
        return;
      }

      const originals = selectedNodes.map(
        (node) =>
          originalTextMapRef.current.get(node) ?? node.textContent ?? ""
      );

      // Call the API ONCE – it will:
      // - use cached rows from page_translations when available
      // - call OpenAI only for missing ones
      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originals,
          targetLang: lang.code,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { translation?: string[] | string; error?: string }
        | null;

      if (!res.ok || !data?.translation) {
        if (res.status === 413) {
          console.warn("[translate-page] payload too long", data);
          setErrorMsg(
            "This page is very long and could not be translated in one go (413)."
          );
          setLoading(false);
          return;
        }

        if (res.status === 429) {
          console.warn("[translate-page] rate limited", data);
          setErrorMsg(
            data?.error ||
              "AI translation is temporarily rate-limited for this page."
          );
          setLoading(false);
          return;
        }

        console.error("[translate-page] server error", res.status, data);
        setErrorMsg(
          data?.error ||
            `Failed to translate this page (status ${res.status}).`
        );
        setLoading(false);
        return;
      }

      const translatedArray = Array.isArray(data.translation)
        ? data.translation
        : originals;

      const m = Math.min(translatedArray.length, selectedNodes.length);

      for (let i = 0; i < m; i++) {
        const node = selectedNodes[i];
        const newText = (translatedArray[i] as string | undefined) || "";
        node.textContent = newText;
      }

      setTranslatedText(
        `Translated ${m} snippets (~${totalChars} characters) to ${lang.label}…`
      );

      // Persist preference + auto-mode flag
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PREF_LANG, lang.code);
        window.localStorage.setItem(LS_LAST_PATH, window.location.pathname);

        if (opts?.auto) {
          window.localStorage.setItem(LS_AUTO_MODE, "1");
        }
      }

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

  function handleTranslateSite() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang, { auto: true });
  }

  // auto-apply translation when navigating (auto-mode)
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

  // drag logic
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

  // language helpers
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
        }).filter(
          (g) => g !== null
        ) as { region: string; items: Language[] }[])
      : [];

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
