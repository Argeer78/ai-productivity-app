
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Simulating API Logic for 'el' (Greek)...");

    // Logic from route.ts
    // 1. Fetch EN
    const { data: enData } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "en")
        .limit(5000);

    const enMap = new Map();
    enData?.forEach(r => enMap.set(r.key, r.text));
    console.log(`Fetched ${enMap.size} EN keys.`);

    // 2. Fetch EL
    const { data: elData } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "el")
        .limit(5000);

    const elMap = new Map();
    elData?.forEach(r => elMap.set(r.key, r.text));
    console.log(`Fetched ${elMap.size} EL keys.`);

    // 3. Merge
    const result = { ...Object.fromEntries(enMap), ...Object.fromEntries(elMap) };

    // Check specific keys
    const checks = ["notes.buttons.saveNote", "notes.category.work", "common.save", "buttons.saveNote"];

    console.log("--- Check Results ---");
    checks.forEach(k => {
        console.log(`[${k}]: '${result[k]}' (Source: ${elMap.has(k) ? "EL" : (enMap.has(k) ? "EN" : "MISSING")})`);
    });
}

main();
