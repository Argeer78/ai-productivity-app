
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Config
const MODEL = "gpt-4o-mini"; // Use a standard, fast model
const BATCH_SIZE = 20;

// Init Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Init OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function getKeys(lang: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let from = 0;
    const PAGE_SIZE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('ui_translations')
            .select('key, text')
            .eq('language_code', lang)
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const r of data) {
            if (r.key) map.set(r.key, r.text || "");
        }

        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return map;
}

async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
    if (texts.length === 0) return [];

    const prompt = `
Translate the following array of UI strings to ${targetLang}.
Return strictly a JSON object with a "translations" array of strings.
Maintain parameters like {0}, {name}, etc. unchanged.
Strings:
${JSON.stringify(texts)}
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: "system", content: "You are a professional translator app." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const raw = completion.choices[0].message.content;
        const parsed = JSON.parse(raw || "{}");
        const arr = parsed.translations;

        if (Array.isArray(arr) && arr.length === texts.length) {
            return arr.map(s => String(s));
        } else {
            console.warn("⚠️ Translation count mismatch or invalid format. Returning originals.");
            return texts;
        }
    } catch (e) {
        console.error("Translation API error:", e);
        return texts; // Fallback
    }
}

async function run() {
    const args = process.argv.slice(2);
    const targetLang = args[0];

    if (!targetLang) {
        console.error("Usage: npx tsx scripts/generateTranslations.ts <lang_code>");
        process.exit(1);
    }

    console.log(`🌍 Loading keys for 'en' and '${targetLang}'...`);

    const enMap = await getKeys('en');
    const targetMap = await getKeys(targetLang);

    console.log(`   EN keys: ${enMap.size}`);
    console.log(`   ${targetLang.toUpperCase()} keys: ${targetMap.size}`);

    const missingKeys: string[] = [];
    for (const key of enMap.keys()) {
        if (!targetMap.has(key)) {
            missingKeys.push(key);
        }
    }

    if (missingKeys.length === 0) {
        console.log("✅ No missing translations.");
        return;
    }

    console.log(`🔄 Found ${missingKeys.length} missing keys for ${targetLang}. Translating...`);

    let processed = 0;
    while (processed < missingKeys.length) {
        const batchKeys = missingKeys.slice(processed, processed + BATCH_SIZE);
        const batchTexts = batchKeys.map(k => enMap.get(k) || "");

        console.log(`   Translating batch ${processed + 1}-${processed + batchKeys.length}...`);

        const translated = await translateBatch(batchTexts, targetLang);

        // Upsert
        const rows = batchKeys.map((key, i) => ({
            key,
            language_code: targetLang,
            text: translated[i],
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('ui_translations')
            .upsert(rows, { onConflict: 'key, language_code' });

        if (error) {
            console.error("   ❌ DB Error:", error.message);
        }

        processed += batchKeys.length;
    }

    console.log("✅ Translation complete.");
}

run().catch(console.error);
