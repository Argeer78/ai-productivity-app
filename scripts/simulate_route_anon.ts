
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
    console.log("Simulating Route Logic exactly with ANON...");

    // Matches route.ts: .in("language_code", languageCode === "en" ? ["en"] : ["en", languageCode])
    const languageCode = "el";
    const langs = ["en", languageCode];

    console.log(`Querying languages: ${langs.join(", ")}`);

    const { data: allRows, error } = await anonClient
        .from("ui_translations")
        .select("key, text, language_code")
        .in("language_code", langs)
        .limit(5000);

    if (error) {
        console.error("Query Error:", error.message);
        return;
    }

    console.log(`Fetched ${allRows?.length} rows.`);

    // Simulate the map build
    const translations: Record<string, string> = {};

    if (allRows) {
        // 1. En pass
        for (const row of allRows) {
            if (row.language_code === "en" && row.key && row.text) {
                translations[row.key] = row.text;
            }
        }
        // 2. Target pass
        if (languageCode !== "en") {
            for (const row of allRows) {
                if (row.language_code === languageCode && row.key && typeof row.text === "string") {
                    translations[row.key] = row.text;
                }
            }
        }
    }

    console.log(`Dict size: ${Object.keys(translations).length}`);
    console.log(`Check 'notes.buttons.saveNote': ${translations["notes.buttons.saveNote"]}`);
    console.log(`Check 'pricing.hero.title': ${translations["pricing.hero.title"]}`);
}

main();
