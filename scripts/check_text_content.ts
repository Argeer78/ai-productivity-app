
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking TEXT content...");

    const { data: hidden } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el")
        .limit(1);

    const txt = hidden?.[0]?.text;
    console.log(`TEXT: [${txt === null ? "NULL" : txt}]`);
    console.log(`TYPE: [${typeof txt}]`);
}

main();
