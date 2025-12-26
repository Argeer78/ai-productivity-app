
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Languages identified as having issues or requested by user
const TARGET_LANGS = ["el", "cs", "ru", "nl", "hu", "ko"];

async function repair() {
    console.log("--- START REPAIR ---");

    // 1. Get English Source
    console.log("Loading English source...");
    const { data: enData } = await supabase.from("ui_translations").select("key, text").eq("language_code", "en");
    const enMap = new Map<string, string>();
    if (enData) enData.forEach(r => enMap.set(r.key, r.text));

    for (const lang of TARGET_LANGS) {
        console.log(`\nAnalyzing ${lang}...`);

        // Fetch all keys for this lang
        const keysMap = new Map<string, string>();
        let from = 0;
        const PAGE = 1000;

        while (true) {
            const { data, error } = await supabase
                .from("ui_translations")
                .select("key, text")
                .eq("language_code", lang)
                .range(from, from + PAGE - 1);

            if (!data || data.length === 0) break;
            data.forEach(r => keysMap.set(r.key, r.text));
            if (data.length < PAGE) break;
            from += PAGE;
        }

        console.log(`  Found ${keysMap.size} existing keys.`);

        // Identify keys to repair
        const toRepair: string[] = [];

        for (const [key, val] of keysMap.entries()) {
            const enVal = enMap.get(key);
            if (!enVal) continue;

            let suspicious = false;

            // 1. Identical to English (and long enough)
            if (val === enVal && enVal.length > 4) suspicious = true;

            // 2. ASCII check for non-Latin languages (Greek, Russian, Korean)
            if (!suspicious) {
                if (lang === 'el') {
                    // If it has no Greek chars (\u0370-\u03FF) but has letters -> Suspicious
                    const hasGreek = /[\u0370-\u03FF]/.test(val);
                    const hasLetters = /[a-zA-Z]/.test(val);
                    if (!hasGreek && hasLetters) suspicious = true;
                }
                else if (lang === 'ru') {
                    const hasCyrillic = /[\u0400-\u04FF]/.test(val);
                    const hasLetters = /[a-zA-Z]/.test(val);
                    if (!hasCyrillic && hasLetters) suspicious = true;
                }
                else if (lang === 'ko') {
                    const hasKorean = /[\uAC00-\uD7AF]/.test(val);
                    const hasLetters = /[a-zA-Z]/.test(val);
                    if (!hasKorean && hasLetters) suspicious = true;
                }
            }

            if (suspicious) {
                toRepair.push(key);
            }
        }

        if (toRepair.length === 0) {
            console.log("  No corrupted keys found.");
            continue;
        }

        console.log(`  Found ${toRepair.length} corrupted keys. Sending for re-translation...`);

        // Batch Process
        let processed = 0;
        const BATCH = 15; // Conservative batch size

        while (processed < toRepair.length) {
            const batchKeys = toRepair.slice(processed, processed + BATCH);
            const batchTexts = batchKeys.map(k => enMap.get(k)!);

            try {
                // console.log(`    Translating batch ${processed} - ${processed + BATCH}...`);
                const prompt = `Translate these UI strings to ${lang}. 
Return strictly a JSON object with a "translations" array of strings.
Maintain formatting, variables, and tone.
Input: ${JSON.stringify(batchTexts)}`;

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                });

                const content = completion.choices[0].message.content || "{}";
                const parsed = JSON.parse(content);
                const translated = parsed.translations;

                if (Array.isArray(translated) && translated.length === batchKeys.length) {
                    const rows = batchKeys.map((key, i) => ({
                        key,
                        language_code: lang,
                        text: translated[i],
                        updated_at: new Date().toISOString()
                    }));

                    const { error: upsertErr } = await supabase
                        .from("ui_translations")
                        .upsert(rows, { onConflict: "key, language_code" });

                    if (upsertErr) console.error("    DB Error:", upsertErr.message);
                    else {
                        // Success 
                    }
                } else {
                    console.error("    Mistmatch in translation count.");
                }

            } catch (err) {
                console.error("    Batch error:", err);
            }

            processed += BATCH;
        }
        console.log("  Done.");
    }

    console.log("--- END REPAIR ---");
}

repair();
