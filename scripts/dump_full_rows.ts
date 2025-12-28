
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Dumping FULL JSON for comparison...");

    const { data: visible } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("key", "pricing.hero.title")
        .eq("language_code", "el")
        .limit(1);

    const { data: hidden } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el")
        .limit(1);

    console.log("--- VISIBLE ---");
    console.log(JSON.stringify(visible?.[0], null, 2));

    console.log("--- HIDDEN ---");
    console.log(JSON.stringify(hidden?.[0], null, 2));
}

main();
