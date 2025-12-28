
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Listing columns (via keys of first row)...");

    const { data } = await supabase
        .from("ui_translations")
        .select("*")
        .limit(1);

    if (data && data.length > 0) {
        console.log("Columns found:");
        // Print one per line to avoid buffer issues
        Object.keys(data[0]).forEach(k => console.log(` - ${k}`));
    } else {
        console.log("No data found to infer columns.");
    }
}

main();
