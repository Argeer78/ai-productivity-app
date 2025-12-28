
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Listing first 20 keys for 'es'...");

    const { data: rows } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "es")
        .limit(20);

    if (rows && rows.length > 0) {
        console.table(rows);
    } else {
        console.log("No rows found.");
    }

    // Check if any key resembles 'save'
    const { data: saveRows } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "es")
        .ilike("key", "%save%")
        .limit(5);

    console.log("\nSearching for '%save%' keys in 'es':");
    console.table(saveRows);
}

main();
