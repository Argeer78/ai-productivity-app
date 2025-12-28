
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking content of 'el' keys...");

    // Check specific known key
    const { data } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "el")
        .in("key", ["notes.category.work", "common.save", "home.welcome"]);

    if (data && data.length > 0) {
        console.table(data);
    } else {
        console.log("No keys found.");
    }
}

main();
