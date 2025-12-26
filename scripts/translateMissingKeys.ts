
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Configuration ---
const BATCH_SIZE = 20;
const MODEL = "gpt-4o-mini"; // Using a standard efficient model

// Hardcoded for robustness in this script, or could import
const TARGET_LANGS = [
    "de", "es", "fr", "it", "pt", "el", "tr", "ru", "ro", "ar",
    "he", "zh", "ja", "id", "hi", "ko", "sr", "bg", "hu", "pl",
    "cs", "da", "sv", "nb", "nl"
];

// Initialize Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function fetchAllKeys(lang: string) {
    let allKeys = new Map<string, string>(); // key -> text
    let from = 0;
    const PAGE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('ui_translations')
            .select('key, text')
            .eq('language_code', lang)
            .range(from, from + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
            if (row.key) allKeys.set(row.key, row.text);
        }

        if (data.length < PAGE) break;
        from += PAGE;
    }
    return allKeys;
}

async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
    const prompt = `Translate these UI strings to ${targetLang}. 
Return strictly a JSON object with a "translations" array of strings.
Maintain formatting, variables, and tone.
Input: ${JSON.stringify(texts)}`;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content || "{}";
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed.translations) && parsed.translations.length === texts.length) {
            return parsed.translations;
        }
        console.warn("⚠️ Translation count mismatch or parsing error. Returning originals.");
        return texts;
    } catch (err: any) {
        console.error("❌ OpenAI Error:", err.message);
        return texts; // Fallback
    }
}

async function run() {
    console.log("🚀 Starting Translation Sync...");

    // 1. Get Source (English)
    console.log("📥 Fetching English source keys...");
    const enMap = await fetchAllKeys('en');
    console.log(`✅ Found ${enMap.size} English keys.`);

    if (enMap.size === 0) {
        console.log("Nothing to translate.");
        return;
    }

    // 2. Process Each Language
    for (const lang of TARGET_LANGS) {
        console.log(`\n🌍 Processing '${lang}'...`);

        // Get existing to find missing
        const existingMap = await fetchAllKeys(lang);
        const missingKeys: string[] = [];

        for (const key of enMap.keys()) {
            if (!existingMap.has(key)) {
                missingKeys.push(key);
            }
        }

        if (missingKeys.length === 0) {
            console.log(`   ✨ Up to date.`);
            continue;
        }

        console.log(`   Found ${missingKeys.length} missing keys.`);

        // Batch Process
        let processed = 0;
        while (processed < missingKeys.length) {
            const batchKeys = missingKeys.slice(processed, processed + BATCH_SIZE);
            const batchTexts = batchKeys.map(k => enMap.get(k) || k);

            console.log(`   Translating batch ${processed + 1}-${processed + batchKeys.length}...`);

            const translations = await translateBatch(batchTexts, lang);

            const rows = batchKeys.map((key, i) => ({
                key,
                language_code: lang,
                text: translations[i],
                updated_at: new Date().toISOString()
            }));

            // Upsert
            const { error } = await supabase
                .from('ui_translations')
                .upsert(rows, { onConflict: 'key, language_code' });

            if (error) {
                console.error(`   ❌ DB Error:`, error.message);
            } else {
                // console.log(`   ✅ Saved.`);
            }

            processed += batchKeys.length;
        }
    }

    console.log("\n🎉 Sync Complete!");
}

run().catch(console.error);
