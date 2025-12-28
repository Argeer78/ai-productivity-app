
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Comparing VISIBLE vs HIDDEN rows...");

    // 1. Fetch a Known Visible Row (Pricing)
    const { data: visible } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("key", "pricing.hero.title")
        .eq("language_code", "el")
        .limit(1);

    // 2. Fetch the Hidden Row (Notes Save)
    const { data: hidden } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el")
        .limit(1);

    console.log("\n--- Visible Row (Pricing) ---");
    console.dir(visible?.[0] || "NOT FOUND", { depth: null });

    console.log("\n--- Hidden Row (Notes Save) ---");
    console.dir(hidden?.[0] || "NOT FOUND", { depth: null });

    // Identify keys present in one but not other, or different values
}

main();
