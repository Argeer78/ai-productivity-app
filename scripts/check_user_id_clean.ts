
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking user_id cleanly...");

    const { data: visible } = await supabase.from("ui_translations")
        .select("key, user_id")
        .eq("key", "pricing.hero.title").eq("language_code", "el").limit(1);

    const { data: hidden } = await supabase.from("ui_translations")
        .select("key, user_id")
        .eq("key", "notes.buttons.saveNote").eq("language_code", "el").limit(1);

    const vId = visible?.[0]?.user_id;
    const hId = hidden?.[0]?.user_id;

    console.log(`VISIBLE_USER_ID: [${vId === null ? "NULL" : vId}]`);
    console.log(`HIDDEN_USER_ID:  [${hId === null ? "NULL" : hId}]`);
}

main();
