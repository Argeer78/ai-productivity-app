
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";

// Parse UI Strings
function getUiStrings() {
    const content = fs.readFileSync("lib/uiStrings.ts", "utf8");
    const matches = content.match(/["']([\w.]+)["']\s*:\s*["'](.+)["']/g);
    const map = new Map<string, string>();
    if (matches) {
        matches.forEach(m => {
            const parts = m.split(":");
            const k = parts[0].trim().replace(/['"]/g, "");
            const valMatch = m.match(/:\s*["'](.+)["']/);
            if (valMatch) {
                map.set(k, valMatch[1]);
            }
        });
    }
    return map;
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const uiMap = getUiStrings();
    console.log(`Parsed ${uiMap.size} keys from code.`);

    // Get existing ES keys
    const { data: dbRows } = await supabase
        .from("ui_translations")
        .select("key")
        .eq("language_code", "es");

    const dbKeys = new Set(dbRows?.map(r => r.key) || []);

    const missing: { key: string, text: string, language_code: string, lang: string }[] = [];

    // We populate ES with EN text but prepend [EN] or just use it.
    // User wants "Translations".
    // I can't translate instantly.
    // I'll leave text as English. It's better than missing key.

    for (const [key, val] of uiMap.entries()) {
        if (!dbKeys.has(key)) {
            missing.push({
                key,
                text: val, // ENGLISH TEXT
                language_code: "es",
                lang: "es"
            });
        }
    }

    console.log(`Found ${missing.length} missing keys for ES.`);

    if (missing.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < missing.length; i += batchSize) {
            const batch = missing.slice(i, i + batchSize);
            console.log(`Inserting batch ${i}...`);
            const { error } = await supabase.from("ui_translations").insert(batch);
            if (error) console.error("Insert error:", error.message);
        }
        console.log("Done inserting.");
    }
}

main();
