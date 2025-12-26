
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fixGreek() {
    console.log("--- START FIX GREEK ---");

    // 1. Fetch all Greek keys
    let from = 0;
    const PAGE = 1000;
    const toDelete: string[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("ui_translations")
            .select("key, text")
            .eq("language_code", "el")
            .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
            // Check if text looks like English (ASCII mainly) and NOT Greek
            // Greek Unicode block is \u0370-\u03FF
            const hasGreek = /[\u0370-\u03FF]/.test(row.text);
            if (!hasGreek && row.text.match(/[a-zA-Z]/)) {
                // It has letters but no Greek letters -> English garbage
                // (Exceptions: numbers, punctuation, identical keys like "ID" or "OK", but usually "OK" is "OK" in Greek too?)
                // Let's be aggressive for now or just log.
                // Actually better: delete them so the sync script picks them up as missing!
                toDelete.push(row.key);
            }
        }

        if (data.length < PAGE) break;
        from += PAGE;
    }

    console.log(`Found ${toDelete.length} suspicious (English-only) keys in Greek.`);

    if (toDelete.length > 0) {
        // Delete them
        const { error: delErr } = await supabase
            .from("ui_translations")
            .delete()
            .eq("language_code", "el")
            .in("key", toDelete);

        if (delErr) {
            console.error("Delete failed", delErr);
            return;
        }
        console.log("✅ Deleted suspicious keys.");
    }

    // 2. Now run simple translation on them directly here, or we can run the main sync script?
    // Let's run a mini-re-translate here for speed, just for these keys.

    if (toDelete.length > 0) {
        console.log("Refetching English sources for these keys...");
        const { data: enData } = await supabase
            .from("ui_translations")
            .select("key, text")
            .eq("language_code", "en")
            .in("key", toDelete);

        const enMap = new Map<string, string>();
        enData?.forEach(r => enMap.set(r.key, r.text));

        const missing = toDelete.filter(k => enMap.has(k));
        console.log(`Translating ${missing.length} keys...`);

        const BATCH = 20;
        let processed = 0;

        while (processed < missing.length) {
            const batchKeys = missing.slice(processed, processed + BATCH);
            const batchTexts = batchKeys.map(k => enMap.get(k)!);

            try {
                const prompt = `Translate these UI strings to Greek (el). 
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
                        language_code: "el",
                        text: translated[i],
                        updated_at: new Date().toISOString()
                    }));

                    await supabase.from("ui_translations").upsert(rows, { onConflict: "key, language_code" });
                    console.log(`  Saved batch ${processed + 1} - ${processed + batchKeys.length}`);
                } else {
                    console.error("Mismatch in batch response");
                }
            } catch (e) {
                console.error("Batch error", e);
            }
            processed += BATCH;
        }
    }

    console.log("--- END FIX GREEK ---");
}

fixGreek();
