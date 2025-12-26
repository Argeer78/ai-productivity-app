
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Ensure we load .env.local from the root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Found" : "Missing");
console.log("Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Found" : "Missing");

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTranslations() {
    console.log("--- START DEBUG ---");

    // Check 'ui_translations' for Greek
    const { data, error } = await supabase
        .from("ui_translations")
        .select("key, text") // Note: script used 'text' but my previous debug used 'translation'. Check schema.
        .eq("language_code", "el") // Script used 'language_code', my debug used 'lang'. Check schema.
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Sample Greek translations:");
    data.forEach(row => {
        console.log(`KEY: ${row.key} | VAL: ${row.text}`);
    });
    console.log("--- END DEBUG ---");
}

checkTranslations();
