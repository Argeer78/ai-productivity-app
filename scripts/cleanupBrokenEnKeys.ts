
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Cleaning up broken EN keys (where text == key)...");

    // We can't do "where key = text" easily in Supabase JS client filter without a stored procedure or raw SQL.
    // So we'll fetch all EN keys and filter in memory, then delete.

    // 1. Fetch all EN
    let page = 0;
    const size = 1000;
    const toDelete: string[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("ui_translations")
            .select("key, text")
            .eq("language_code", "en")
            .range(page * size, (page + 1) * size - 1);

        if (error) {
            console.error("Fetch error:", error);
            break;
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
            if (row.text === row.key) {
                toDelete.push(row.key);
            }
        }

        if (data.length < size) break;
        page++;
    }

    console.log(`Found ${toDelete.length} broken keys (text matches key).`);

    if (toDelete.length > 0) {
        // Delete in batches
        const BATCH = 50;
        for (let i = 0; i < toDelete.length; i += BATCH) {
            const batch = toDelete.slice(i, i + BATCH);
            const { error } = await supabase
                .from("ui_translations")
                .delete()
                .eq("language_code", "en")
                .in("key", batch);

            if (error) console.error("Delete error:", error);
            else console.log(`Deleted batch ${i} - ${i + batch.length}`);
        }
        console.log("✅ Cleanup complete.");
    } else {
        console.log("No broken keys found.");
    }
}

main();
