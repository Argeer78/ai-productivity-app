
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking duplicates and content for 'el'...");

    // Check specific known key
    const { data, error } = await supabase
        .from("ui_translations")
        .select("id, key, text, language_code")
        .eq("language_code", "el")
        .in("key", ["notes.category.work", "common.save"]);

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(row => {
            console.log(`[${row.id}] Key: '${row.key}' | Text: '${row.text}'`);
        });
    } else {
        console.log("No keys found.");
    }
}

main();
