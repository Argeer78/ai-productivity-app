
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Spoofing created_at for 'el' keys...");
    const OLD_DATE = "2024-01-01T12:00:00.000Z";

    // Update ALL 'notes.*' keys for EL to be OLD
    const { data: rows, error: readError } = await supabase
        .from("ui_translations")
        .select("id, key")
        .eq("language_code", "el")
        .like("key", "notes.%");

    if (readError) {
        console.error("Read Error:", readError);
        return;
    }

    console.log(`Found ${rows?.length || 0} EL keys to backdate.`);
    if (!rows || rows.length === 0) return;

    // Supabase can't do bulk update with different IDs easily in one go unless criteria matches.
    // We can do an Update where...

    // Actually, Update ALL matches logic.
    const { error: updateError } = await supabase
        .from("ui_translations")
        .update({ created_at: OLD_DATE })
        .eq("language_code", "el")
        .like("key", "notes.%");

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log("Success! Backdated keys to 2024-01-01.");
    }
}

main();
