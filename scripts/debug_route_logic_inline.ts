
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// MOCK CONSTANTS
const UI_STRINGS = {
    "common.save": "Save (Fallback)",
    "common.cancel": "Cancel (Fallback)"
};

// MOCK ADMIN CLIENT GETTER (With the fix applied)
function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // The specific fix line:
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
    console.log("Starting API Logic Simulation for 'es'...");

    const lang = "es";
    const languageCode = lang; // Simple normalization

    const supabase = getSupabaseAdmin();
    console.log("Supabase Client Acquired:", !!supabase);

    if (!supabase) {
        console.error("FATAL: No client.");
        return;
    }

    // Logic from route.ts
    // 1. Init with defaults
    const translations: Record<string, string> = { ...UI_STRINGS };

    // 2. Fetch
    console.log(`Querying for ['en', '${languageCode}']...`);

    // NOTE: Using 'language_code' as per recent revert
    const { data: allRows, error } = await supabase
        .from("ui_translations")
        .select("key, text, language_code")
        .in("language_code", languageCode === "en" ? ["en"] : ["en", languageCode])
        .limit(5000);

    if (error) {
        console.error("Fetch Error:", error.message);
        return;
    }

    console.log(`Fetched ${allRows?.length} rows.`);

    if (allRows) {
        // 1. First pass: Apply 'en' DB overrides on top of UI_STRINGS
        let enCount = 0;
        for (const row of allRows) {
            if (row.language_code === "en" && row.key && row.text) {
                translations[row.key] = row.text;
                enCount++;
            }
        }
        console.log(`Applied ${enCount} English overrides.`);

        // 2. Second pass: Apply target language overrides (if strictly not en)
        let targetCount = 0;
        if (languageCode !== "en") {
            for (const row of allRows) {
                if (row.language_code === languageCode && row.key && typeof row.text === "string") {
                    translations[row.key] = row.text;
                    targetCount++;
                }
            }
        }
        console.log(`Applied ${targetCount} Spanish overrides.`);

        // Verification
        const sampleKey = "common.save"; // adjust if needed
        console.log(`Value for '${sampleKey}':`, translations[sampleKey]);

        // Check if fallback happened
        if (targetCount === 0) {
            console.log("WARNING: No Spanish overrides found! (Still English)");
        } else {
            console.log("SUCCESS: Spanish translations found.");
        }
    }
}

main();
