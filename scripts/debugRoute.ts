
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config({ path: ".env.local" });

// Inline logic to avoid module resolution headers
function getSupabaseAdmin() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error("Missing env vars in script");
    }
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
}

async function run() {
    console.log("Testing getSupabaseAdmin...");

    // 1. Check if admin client initializes
    try {
        const admin = getSupabaseAdmin();
        console.log("Admin client obtained:", !!admin);

        // 2. Run the EN query with limit 5000
        console.log("Fetching EN keys...");
        const { data: enRows, error: enErr } = await admin
            .from("ui_translations")
            .select("key")
            .eq("language_code", "en")
            .limit(5000);

        if (enErr) {
            console.error("EN Error:", enErr);
        } else {
            console.log(`EN Rows: ${enRows?.length}`);
            if (enRows && enRows.length < 20) console.log(enRows);
        }

        // 3. Run the EL query with loop
        console.log("Fetching EL keys (paginated)...");
        let allElRows: any[] = [];
        let page = 0;
        const size = 1000;
        while (true) {
            const { data, error } = await admin
                .from("ui_translations")
                .select("key, text")
                .eq("language_code", "el")
                .range(page * size, (page + 1) * size - 1);

            if (error) {
                console.error("EL Error:", error);
                break;
            }
            if (!data || data.length === 0) break;

            allElRows = [...allElRows, ...data];
            console.log(`Page ${page}: fetched ${data.length} rows`);
            if (data.length < size) break;
            page++;
        }

        console.log(`TOTAL EL_COUNT: ${allElRows.length}`);
        const found = allElRows.find(r => r.key === "home.features.dashboard.title");
        console.log(`IS_FOUND: ${!!found}`);
        if (found) console.log("Value:", found.text);

    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}
run();
