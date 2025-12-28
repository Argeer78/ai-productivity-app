
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Verifying migration for 'el'...");

    // Check key keys
    const { data } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "el")
        .in("key", [
            "notes.buttons.saveNote",
            "notes.buttons.editSave",
            "notes.category.work",
            "notes.list.title",
            "notes.tasks.suggested.title"
        ]);

    if (data && data.length > 0) {
        data.forEach(row => {
            console.log(`[${row.key}]: ${row.text}`);
        });
    } else {
        console.log("No keys found.");
    }
}

main();
