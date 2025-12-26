
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LANGS_TO_CHECK = [
    "de", "es", "fr", "it", "pt", "el", "tr", "ru", "ro", "ar",
    "he", "zh", "ja", "id", "hi", "ko", "sr", "bg", "hu", "pl",
    "cs", "da", "sv", "nb", "nl"
];

async function scan() {
    console.log("--- START GLOBAL SCAN ---");

    // Get English reference
    const { data: enData } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "en");

    const enMap = new Map<string, string>();
    if (enData) enData.forEach(r => enMap.set(r.key, r.text));

    console.log(`Loaded ${enMap.size} English keys.`);

    let results: any[] = [];

    for (const lang of LANGS_TO_CHECK) {
        let suspiciousCount = 0;
        let totalCount = 0;

        let from = 0;
        const PAGE = 1000;

        while (true) {
            const { data, error } = await supabase
                .from("ui_translations")
                .select("key, text")
                .eq("language_code", lang)
                .range(from, from + PAGE - 1);

            if (error) {
                console.error(`Error scanning ${lang}:`, error);
                break;
            }
            if (!data || data.length === 0) break;

            totalCount += data.length;

            for (const row of data) {
                const enText = enMap.get(row.key);
                if (!enText) continue;

                if (row.text === enText && enText.length > 5) {
                    suspiciousCount++;
                }
            }

            if (data.length < PAGE) break;
            from += PAGE;
        }

        const percent = totalCount > 0 ? ((suspiciousCount / totalCount) * 100).toFixed(1) : "0";
        console.log(`[${lang}] Total: ${totalCount} | Suspicious: ${suspiciousCount} (${percent}%)`);
        results.push({ lang, totalCount, suspiciousCount, percent });
    }

    fs.writeFileSync('scan_results.json', JSON.stringify(results, null, 2));
    console.log("--- END GLOBAL SCAN ---");
}

scan();
