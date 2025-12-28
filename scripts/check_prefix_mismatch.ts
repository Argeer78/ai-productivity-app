
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking for keys containing 'category.work' in 'el'...");

    // Look for anything ending in category.work or just equal to it
    const { data } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "el")
        .ilike("key", "%category.work");

    if (data && data.length > 0) {
        console.table(data);
    } else {
        console.log("No partial match found for 'category.work'.");
    }
}

main();
