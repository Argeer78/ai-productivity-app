
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Dumping 'el' keys to file...");

    // Fetch ALL EL keys
    const { data: rows } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "el");

    const content = JSON.stringify(rows || [], null, 2);
    fs.writeFileSync("scripts/debug_el_keys.txt", content);
    console.log(`Dumpted ${(rows || []).length} keys to scripts/debug_el_keys.txt`);
}

main();
