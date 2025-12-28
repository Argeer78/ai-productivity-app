
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
    console.log("Checking ANON visibility of Pricing vs Notes...");

    // 1. Pricing
    const { data: pricing } = await anonClient.from("ui_translations")
        .select("key")
        .eq("key", "pricing.hero.title").eq("language_code", "el");

    console.log(`ANON sees Pricing: ${pricing?.length ?? 0}`);

    // 2. Notes
    const { data: notes } = await anonClient.from("ui_translations")
        .select("key")
        .eq("key", "notes.buttons.saveNote").eq("language_code", "el");

    console.log(`ANON sees Notes:   ${notes?.length ?? 0}`);
}

main();
