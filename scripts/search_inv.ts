
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Searching for 'Trabajo' in ANY key/column...");

    // Reverse lookup
    const { data: rows } = await supabase
        .from("ui_translations")
        .select("key, language_code, lang, text")
        .ilike("text", "%Trabajo%")
        .limit(10);

    if (rows && rows.length > 0) {
        console.table(rows);
    } else {
        console.log("Not found 'Trabajo' anywhere.");
    }
}

main();
