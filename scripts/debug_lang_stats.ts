
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking row counts per language code...");

    // Check 'en', 'es', 'es-ES'
    const codes = ['en', 'es', 'es-ES', 'el', 'el-GR', 'tr', 'fr'];

    for (const code of codes) {
        const { count } = await supabase
            .from("ui_translations")
            .select("*", { count: 'exact', head: true })
            .eq("language_code", code);

        console.log(`Code '${code}': ${count} rows`);
    }

    // Also check LANG column for same
    console.log("\nChecking LANG column counts...");
    for (const code of codes) {
        const { count } = await supabase
            .from("ui_translations")
            .select("*", { count: 'exact', head: true })
            .eq("lang", code);

        console.log(`Lang '${code}': ${count} rows`);
    }
}

main();
