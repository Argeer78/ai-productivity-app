
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
    console.log("=== DIAGNOSIS ===");

    // 1. Check Anon Visibility
    console.log("\n1. Anon Client Visibility:");
    const { data: anonData, error: anonError } = await anonClient
        .from("ui_translations")
        .select("key")
        .eq("key", "notes.buttons.saveNote")
        .eq("language_code", "el");

    if (anonError) console.error("   Anon Error:", anonError.message);
    else console.log(`   Anon found: ${anonData?.length} rows.`);


    // 2. Simulate Route Env Logic
    console.log("\n2. Admin Logic Simulation:");
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    console.log(`   SUPABASE_SERVICE_ROLE_KEY is ${serviceRole ? "PRESENT" : "MISSING"}`);
    console.log(`   SUPABASE_SERVICE_KEY is ${serviceKey ? "PRESENT" : "MISSING"}`);

    const keyToUse = serviceRole || serviceKey;
    if (!keyToUse) {
        console.error("   CRITICAL: No service key available for Admin!");
    } else {
        const adminClient = createClient(url, keyToUse, { auth: { persistSession: false } });
        const { data: adminData, error: adminError } = await adminClient
            .from("ui_translations")
            .select("key")
            .eq("key", "notes.buttons.saveNote")
            .eq("language_code", "el");

        if (adminError) console.error("   Admin Error:", adminError.message);
        else console.log(`   Admin found: ${adminData?.length} rows.`);
    }
}

main();
