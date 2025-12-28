
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
    console.log("Checking visibility of 'notes.buttons.saveNote' as ANON...");

    const { data, error } = await anonClient
        .from("ui_translations")
        .select("*")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el");

    if (error) {
        console.error("Anon Error:", error);
    } else {
        console.log(`Anon found ${data?.length} rows.`);
        if (data && data.length > 0) {
            console.log("Row:", data[0]);
        } else {
            console.log("Row NOT found by Anon.");
        }
    }

    console.log("\n--- Comparison: Admin Check ---");
    // Verify it exists with Admin
    const adminClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: adminData } = await adminClient
        .from("ui_translations")
        .select("*")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el");

    console.log(`Admin found ${adminData?.length} rows.`);
}

main();
