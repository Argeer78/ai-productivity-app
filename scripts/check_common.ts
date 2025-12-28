
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking for 'common.%' keys in 'es'...");

    const { count, error } = await supabase
        .from("ui_translations")
        .select("*", { count: 'exact', head: true })
        .eq("language_code", "es")
        .ilike("key", "common.%");

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${count} keys starting with 'common.' in ES.`);
}

main();
