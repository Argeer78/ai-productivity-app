
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // Configured fix
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
    const admin = getSupabaseAdmin();
    if (!admin) {
        console.log("No Admin");
        return;
    }

    const { data } = await admin
        .from("ui_translations")
        .select("text")
        .eq("language_code", "es")
        .eq("key", "notes.category.work")
        .limit(1);

    if (data && data[0]) {
        console.log("\n\n\n>>>>> VALUE: " + data[0].text + " <<<<<\n\n\n");
    } else {
        console.log("\n\n\n>>>>> VALUE: NULL (Not Found) <<<<<\n\n\n");
    }
}
main();
