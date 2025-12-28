
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Checking user_id values...");

    // 1. Fetch Visible
    const { data: visible } = await supabase
        .from("ui_translations")
        .select("key, user_id")
        .eq("key", "pricing.hero.title")
        .eq("language_code", "el")
        .limit(1);

    // 2. Fetch Hidden
    const { data: hidden } = await supabase
        .from("ui_translations")
        .select("key, user_id")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el")
        .limit(1);

    console.log(`VISIBLE (pricing.hero.title) user_id: ${visible?.[0]?.user_id}`);
    console.log(`HIDDEN (notes.buttons.saveNote) user_id: ${hidden?.[0]?.user_id}`);
}

main();
