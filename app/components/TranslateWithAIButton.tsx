// ----- page translation (single batch, React-safe) -----
async function translatePageWithLang(
  lang: Language,
  opts?: { auto?: boolean }
) {
  setErrorMsg("");
  setTranslatedText("Preparing page for translation…");
  setLoading(true);

  try {
    // 1️⃣ Collect all translatable nodes
    const allNodes = getTranslatableTextNodes();

    if (!allNodes.length) {
      setErrorMsg("No text found on this page to translate.");
      setLoading(false);
      return;
    }

    // Apply global caps
    const nodesWithinLimits: Text[] = [];
    let globalChars = 0;

    for (const node of allNodes) {
      if (nodesWithinLimits.length >= MAX_NODES_PER_PAGE) break;

      const text = node.textContent || "";
      const len = text.length;

      if (len < 3) continue;
      if (globalChars + len > MAX_TOTAL_CHARS) break;

      nodesWithinLimits.push(node);
      globalChars += len;
    }

    if (!nodesWithinLimits.length) {
      setErrorMsg("There was nothing suitable to translate on this page.");
      setLoading(false);
      return;
    }

    // 2️⃣ Build unique list of texts to translate
    const originalTexts = nodesWithinLimits.map((n) => n.textContent || "");
    const uniqueTexts = Array.from(new Set(originalTexts.map((t) => t.trim()))).filter(
      Boolean
    );

    // If everything is super short / empty
    if (!uniqueTexts.length) {
      setErrorMsg("There was nothing suitable to translate on this page.");
      setLoading(false);
      return;
    }

    // 3️⃣ Call API once for all unique texts
    const res = await fetch("/api/ai-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: uniqueTexts,
        targetLang: lang.code,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | { translation?: string[] | string; error?: string }
      | null;

    if (!res.ok || !data?.translation) {
      if (res.status === 413) {
        setErrorMsg(
          "This page is too long to translate in one go. Please try a smaller section."
        );
        setLoading(false);
        return;
      }

      if (res.status === 429) {
        setErrorMsg(
          data?.error ||
            "AI translation is temporarily rate-limited. Please try again in a few seconds."
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

    // 4️⃣ Build map: original -> translated
    const translatedArray = Array.isArray(data.translation)
      ? data.translation
      : uniqueTexts; // fallback

    const translationMap = new Map<string, string>();
    for (let i = 0; i < uniqueTexts.length; i++) {
      const original = uniqueTexts[i];
      const translated = translatedArray[i] ?? original;
      translationMap.set(original, translated);
    }

    // 5️⃣ Re-scan DOM and apply translations using the map
    const langCode = lang.code.toLowerCase();
    const finalNodes = getTranslatableTextNodes(); // fresh nodes after any React re-renders

    let translatedSnippets = 0;
    let translatedChars = 0;

    for (const node of finalNodes) {
      const original = (node.textContent || "").trim();
      if (!original) continue;

      const translated = translationMap.get(original);
      if (!translated) continue;

      node.textContent = translated;
      translatedSnippets++;
      translatedChars += translated.length;

      // also warm local cache for future small changes
      cacheRef.current.set(`${langCode}::${original}`, translated);
    }

    if (!translatedSnippets) {
      setTranslatedText(
        `Loaded ${uniqueTexts.length} translations for ${lang.label}, but the current page content did not match them exactly.`
      );
    } else {
      setTranslatedText(
        `Translated ${translatedSnippets} snippets (~${translatedChars} characters) to ${lang.label} using cached translations.`
      );
    }

    // 6️⃣ Persist preference + auto-mode flag
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
