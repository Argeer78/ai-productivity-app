
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Listing 'common.%' keys in 'es'...");

    const { data } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "es")
        .ilike("key", "common.%");

    console.table(data || []);
}

main();
