"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

type Region =
  | "Popular"
  | "Europe"
  | "Asia"
  | "Middle East"
  | "Africa"
  | "Americas"
  | "Oceania";

type Language = {
  code: string;
  label: string;
  flag: string;
  region: Region;
  popular?: boolean;
};

type TranslationResponse = {
  translation?: string;
  error?: string;
};

// LocalStorage keys
const LS_PREF_LANG = "aihub_pref_lang";
const LS_LAST_PATH = "aihub_last_path";

// Hard limits for page translation to control cost & speed
const MAX_NODES_PER_PAGE = 60;
const MAX_TOTAL_CHARS = 8000;
const SEPARATOR = "\n\n----\n\n";

const LANGUAGES: Language[] = [
  // ----- Popular -----
  { code: "en", label: "English", flag: "🇺🇸", region: "Popular", popular: true },
  { code: "es", label: "Spanish", flag: "🇪🇸", region: "Popular", popular: true },
  { code: "fr", label: "French", flag: "🇫🇷", region: "Popular", popular: true },
  { code: "de", label: "German", flag: "🇩🇪", region: "Popular", popular: true },
  { code: "pt", label: "Portuguese", flag: "🇵🇹", region: "Popular", popular: true },
  { code: "ru", label: "Russian", flag: "🇷🇺", region: "Popular", popular: true },
  { code: "it", label: "Italian", flag: "🇮🇹", region: "Popular", popular: true },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Popular", popular: true },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Popular", popular: true },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Popular", popular: true },
  { code: "ar", label: "Arabic", flag: "🇸🇦", region: "Popular", popular: true },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Popular", popular: true },

  // ===== Europe =====
  { code: "en", label: "English (UK)", flag: "🇬🇧", region: "Europe" },
  { code: "en", label: "English (Ireland)", flag: "🇮🇪", region: "Europe" },
  { code: "de", label: "German (Germany)", flag: "🇩🇪", region: "Europe" },
  { code: "de", label: "German (Austria)", flag: "🇦🇹", region: "Europe" },
  { code: "de", label: "German (Switzerland)", flag: "🇨🇭", region: "Europe" },
  { code: "fr", label: "French (France)", flag: "🇫🇷", region: "Europe" },
  { code: "fr", label: "French (Belgium)", flag: "🇧🇪", region: "Europe" },
  { code: "fr", label: "French (Luxembourg)", flag: "🇱🇺", region: "Europe" },
  { code: "fr", label: "French (Switzerland)", flag: "🇨🇭", region: "Europe" },
  { code: "fr", label: "French (Monaco)", flag: "🇲🇨", region: "Europe" },
  { code: "es", label: "Spanish (Spain)", flag: "🇪🇸", region: "Europe" },
  { code: "pt", label: "Portuguese (Portugal)", flag: "🇵🇹", region: "Europe" },
  { code: "it", label: "Italian (Italy)", flag: "🇮🇹", region: "Europe" },
  { code: "it", label: "Italian (San Marino)", flag: "🇸🇲", region: "Europe" },
  { code: "it", label: "Italian (Vatican City)", flag: "🇻🇦", region: "Europe" },
  { code: "nl", label: "Dutch (Netherlands)", flag: "🇳🇱", region: "Europe" },
  { code: "nl", label: "Dutch (Belgium)", flag: "🇧🇪", region: "Europe" },
  { code: "da", label: "Danish", flag: "🇩🇰", region: "Europe" },
  { code: "sv", label: "Swedish", flag: "🇸🇪", region: "Europe" },
  { code: "nb", label: "Norwegian (Bokmål)", flag: "🇳🇴", region: "Europe" },
  { code: "fi", label: "Finnish", flag: "🇫🇮", region: "Europe" },
  { code: "is", label: "Icelandic", flag: "🇮🇸", region: "Europe" },
  { code: "et", label: "Estonian", flag: "🇪🇪", region: "Europe" },
  { code: "lv", label: "Latvian", flag: "🇱🇻", region: "Europe" },
  { code: "lt", label: "Lithuanian", flag: "🇱🇹", region: "Europe" },
  { code: "pl", label: "Polish", flag: "🇵🇱", region: "Europe" },
  { code: "cs", label: "Czech", flag: "🇨🇿", region: "Europe" },
  { code: "sk", label: "Slovak", flag: "🇸🇰", region: "Europe" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺", region: "Europe" },
  { code: "ro", label: "Romanian", flag: "🇷🇴", region: "Europe" },
  { code: "bg", label: "Bulgarian", flag: "🇧🇬", region: "Europe" },
  { code: "el", label: "Greek", flag: "🇬🇷", region: "Europe" },
  { code: "hr", label: "Croatian", flag: "🇭🇷", region: "Europe" },
  { code: "sl", label: "Slovenian", flag: "🇸🇮", region: "Europe" },
  { code: "sr", label: "Serbian", flag: "🇷🇸", region: "Europe" },
  { code: "bs", label: "Bosnian", flag: "🇧🇦", region: "Europe" },
  { code: "mk", label: "Macedonian", flag: "🇲🇰", region: "Europe" },
  { code: "sq", label: "Albanian", flag: "🇦🇱", region: "Europe" },
  { code: "me", label: "Montenegrin", flag: "🇲🇪", region: "Europe" },
  { code: "ru", label: "Russian (Europe)", flag: "🇷🇺", region: "Europe" },
  { code: "uk", label: "Ukrainian", flag: "🇺🇦", region: "Europe" },
  { code: "be", label: "Belarusian", flag: "🇧🇾", region: "Europe" },
  { code: "ro", label: "Romanian (Moldova)", flag: "🇲🇩", region: "Europe" },
  { code: "ka", label: "Georgian", flag: "🇬🇪", region: "Europe" },
  { code: "hy", label: "Armenian", flag: "🇦🇲", region: "Europe" },
  { code: "tr", label: "Turkish (Europe)", flag: "🇹🇷", region: "Europe" },

  // ===== Asia =====
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Asia" },
  { code: "zh-TW", label: "Chinese (Traditional)", flag: "🇹🇼", region: "Asia" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Asia" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Asia" },
  { code: "bn", label: "Bengali", flag: "🇧🇩", region: "Asia" },
  { code: "ur", label: "Urdu", flag: "🇵🇰", region: "Asia" },
  { code: "ta", label: "Tamil", flag: "🇮🇳", region: "Asia" },
  { code: "te", label: "Telugu", flag: "🇮🇳", region: "Asia" },
  { code: "ml", label: "Malayalam", flag: "🇮🇳", region: "Asia" },
  { code: "th", label: "Thai", flag: "🇹🇭", region: "Asia" },
  { code: "vi", label: "Vietnamese", flag: "🇻🇳", region: "Asia" },
  { code: "id", label: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "ms", label: "Malay", flag: "🇲🇾", region: "Asia" },
  { code: "km", label: "Khmer", flag: "🇰🇭", region: "Asia" },
  { code: "lo", label: "Lao", flag: "🇱🇦", region: "Asia" },
  { code: "my", label: "Burmese", flag: "🇲🇲", region: "Asia" },
  { code: "si", label: "Sinhala", flag: "🇱🇰", region: "Asia" },
  { code: "ne", label: "Nepali", flag: "🇳🇵", region: "Asia" },
  { code: "fa", label: "Persian (Farsi)", flag: "🇮🇷", region: "Asia" },

  // ===== Middle East =====
  { code: "ar", label: "Arabic (Standard)", flag: "🇺🇳", region: "Middle East" },
  { code: "he", label: "Hebrew", flag: "🇮🇱", region: "Middle East" },
  { code: "tr", label: "Turkish", flag: "🇹🇷", region: "Middle East" },
  { code: "ku", label: "Kurdish", flag: "🇹🇷", region: "Middle East" },
  { code: "fa", label: "Persian (Iran)", flag: "🇮🇷", region: "Middle East" },

  // ===== Africa =====
  { code: "sw", label: "Swahili", flag: "🇰🇪", region: "Africa" },
  { code: "am", label: "Amharic", flag: "🇪🇹", region: "Africa" },
  { code: "zu", label: "Zulu", flag: "🇿🇦", region: "Africa" },
  { code: "xh", label: "Xhosa", flag: "🇿🇦", region: "Africa" },
  { code: "st", label: "Sesotho", flag: "🇱🇸", region: "Africa" },
  { code: "af", label: "Afrikaans", flag: "🇿🇦", region: "Africa" },
  { code: "yo", label: "Yoruba", flag: "🇳🇬", region: "Africa" },
  { code: "ig", label: "Igbo", flag: "🇳🇬", region: "Africa" },
  { code: "ha", label: "Hausa", flag: "🇳🇬", region: "Africa" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼", region: "Africa" },
  { code: "so", label: "Somali", flag: "🇸🇴", region: "Africa" },
  { code: "fr", label: "French (Africa)", flag: "🇨🇩", region: "Africa" },
  { code: "ar", label: "Arabic (North Africa)", flag: "🇲🇦", region: "Africa" },
  { code: "pt", label: "Portuguese (Mozambique)", flag: "🇲🇿", region: "Africa" },

  // ===== Americas =====
  { code: "en", label: "English (USA)", flag: "🇺🇸", region: "Americas" },
  { code: "en", label: "English (Canada)", flag: "🇨🇦", region: "Americas" },
  { code: "fr", label: "French (Canada)", flag: "🇨🇦", region: "Americas" },
  { code: "es", label: "Spanish (Mexico)", flag: "🇲🇽", region: "Americas" },
  { code: "es", label: "Spanish (Latin America)", flag: "🌎", region: "Americas" },
  { code: "pt-BR", label: "Portuguese (Brazil)", flag: "🇧🇷", region: "Americas" },

  // ===== Oceania =====
  { code: "en", label: "English (Australia)", flag: "🇦🇺", region: "Oceania" },
  { code: "en", label: "English (New Zealand)", flag: "🇳🇿", region: "Oceania" },
];

const REGION_ORDER: Exclude<Region, "Popular">[] = [
  "Europe",
  "Asia",
  "Middle East",
  "Africa",
  "Americas",
  "Oceania",
];

// Collect text nodes, skipping the translation modal itself
function getTranslatableTextNodes(): Text[] {
  if (typeof document === "undefined") return [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip anything inside the translate modal
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
    } as any,
    false
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
  const [open, setOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | null>(
    LANGUAGES.find((l) => l.region === "Popular") || LANGUAGES[0]
  );
  const [search, setSearch] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // drag
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

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

      const data = (await res
        .json()
        .catch(() => null)) as TranslationResponse | null;

      if (!res.ok) {
        console.error("[translate-ui] server error", res.status, data);
        setErrorMsg(
          (data && data.error) ||
            `Failed to translate (status ${res.status}).`
        );
        return;
      }

      if (!data?.translation) {
        setErrorMsg("No translation returned from server.");
        return;
      }

      setTranslatedText(data.translation);
    } catch (err) {
      console.error("[translate-ui] fetch error", err);
      setErrorMsg("Network error while calling translation API.");
    } finally {
      setLoading(false);
    }
  }

  // ----- page translation (with hard caps for cost/speed) -----
  async function translatePageWithLang(lang: Language) {
    setErrorMsg("");
    setTranslatedText("");
    setLoading(true);

    try {
      const allNodes = getTranslatableTextNodes();

      if (!allNodes.length) {
        setErrorMsg("No text found on this page to translate.");
        setLoading(false);
        return;
      }

      const textNodes: Text[] = [];
      let totalChars = 0;

      for (const node of allNodes) {
        if (textNodes.length >= MAX_NODES_PER_PAGE) break;

        const text = node.textContent || "";
        const len = text.length;

        if (len < 3) continue;

        if (totalChars + len > MAX_TOTAL_CHARS) break;

        textNodes.push(node);
        totalChars += len;
      }

      if (!textNodes.length) {
        setErrorMsg("Not enough text to translate on this page.");
        setLoading(false);
        return;
      }

      const joined = textNodes.map((n) => n.textContent || "").join(SEPARATOR);

      const res = await fetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: joined,
          targetLang: lang.code,
        }),
      });

      const data = (await res
        .json()
        .catch(() => null)) as TranslationResponse | null;

      if (!res.ok || !data?.translation) {
        console.error("[translate-page] server error for chunk", res.status, data);
        setErrorMsg(
          (data && data.error) ||
            `Failed to translate page (status ${res.status}).`
        );
        return;
      }

      const parts = String(data.translation).split(SEPARATOR);

      if (parts.length !== textNodes.length) {
        console.error(
          "[translate-page] mismatch",
          "nodes:",
          textNodes.length,
          "parts:",
          parts.length
        );
        const m = Math.min(parts.length, textNodes.length);
        for (let i = 0; i < m; i++) {
          textNodes[i].textContent = parts[i];
        }
        setErrorMsg(
          `Page translated to ${lang.label}, but some parts may remain in the original language.`
        );
      } else {
        for (let i = 0; i < textNodes.length; i++) {
          textNodes[i].textContent = parts[i];
        }
        setTranslatedText(
          `Translated about ${textNodes.length} snippets (${totalChars} characters) to ${lang.label}.`
        );
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PREF_LANG, lang.code);
        window.localStorage.setItem(LS_LAST_PATH, window.location.pathname);
      }
    } catch (err) {
      console.error("[translate-page] error", err);
      setErrorMsg("Network error while translating the page.");
    } finally {
      setLoading(false);
    }
  }

  function handleTranslatePage() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang);
  }

  // Optional: AI Hub auto button just calls same function
  function handleTranslateSite() {
    if (!selectedLang) return;
    translatePageWithLang(selectedLang);
  }
  function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
  e.preventDefault();
  setDragging(true);
  dragStartRef.current = { x: e.clientX, y: e.clientY };
}

 // ----- drag logic -----
useEffect(() => {
  function handleMouseMove(e: MouseEvent) {
    if (!dragging) return;

    const start = dragStartRef.current;
    if (!start) return;

    setPosition((prev) => ({
      top: prev.top + (e.clientY - start.y),
      left: prev.left + (e.clientX - start.x),
    }));

    // update starting point for the next event
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

  const groupedByRegion = !filteredLanguages
    ? (REGION_ORDER.map((region) => {
        const items = LANGUAGES.filter(
          (l) => l.region === region
        ).sort((a, b) => a.label.localeCompare(b.label));
        if (!items.length) return null;
        return { region, items };
      }).filter(Boolean) as { region: Region; items: Language[] }[])
    : [];

  // ----- render -----
  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-[11px] text-slate-100"
      >
        <span>🌎 Translate with AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
        >
          <div
            data-translate-modal="1"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: "translateX(-50%)",
            }}
            className="w-[95%] max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
          >
            {/* Header (draggable) */}
            <div
              className="cursor-move flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/80 rounded-t-2xl"
              onMouseDown={startDrag}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🌎</span>
                <div>
                  <p className="text-xs font-semibold text-slate-100">
                    Translate with AI
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Select your language and translate text or the page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3 text-xs">
              {/* Language picker */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Target language
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language (e.g. Spanish, 日本語, Português)…"
                  className="w-full px-3 py-2 mb-2 rounded-xl bg-slate-950 border border-slate-700 text-[12px] text-slate-100"
                />

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-2 space-y-2">
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
                                : "text-slate-100 hover:bg-slate-800/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-300/80">
                              {lang.code}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500 px-1">
                        No languages found for “{search}”.
                      </p>
                    )
                  ) : (
                    <>
                      {/* Most popular */}
                      {popularLanguages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-1 px-1">
                            <span className="text-[10px] text-amber-300">⭐</span>
                            <span className="text-[10px] font-semibold text-slate-300">
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
                                      : "text-slate-100 hover:bg-slate-800/70"
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-300/80">
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
                          <p className="text-[10px] font-semibold text-slate-400 px-1 mb-1">
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
                                      : "text-slate-100 hover:bg-slate-800/70"
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-300/80">
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
                <label className="block text-[11px] text-slate-400 mb-1">
                  Text to translate
                </label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Type or paste text, or select text on the page before opening."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-2 max-h-32 min-h-[80px] text-[11px] text-slate-200 resize-vertical"
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
                    className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-[11px] font-medium text-slate-100 disabled:opacity-60"
                  >
                    {loading ? "Working on page…" : "Translate this page"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTranslateSite}
                    disabled={loading || !selectedLang}
                    className="px-4 py-2 rounded-xl border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-medium text-emerald-100 disabled:opacity-60"
                  >
                    {loading
                      ? "Applying to AI Hub…"
                      : "Translate AI Hub (auto)"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200"
                >
                  Close
                </button>
              </div>

              {/* Result / status */}
              {translatedText && (
                <div className="mt-2">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Translation status
                  </p>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2 max-h-52 overflow-y-auto text-[11px] text-slate-100 whitespace-pre-wrap">
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
