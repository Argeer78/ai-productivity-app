
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Dumping 'es' keys to file...");

    // Fetch 100 ES keys
    const { data: rows } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "es")
        .limit(100);

    const content = JSON.stringify(rows || [], null, 2);
    fs.writeFileSync("scripts/debug_keys.txt", content);
    console.log("Written scripts/debug_keys.txt");
}

main();
