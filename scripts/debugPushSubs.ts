import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function checkSubs() {
    console.log("Checking push_subscriptions table...");
    const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*");

    if (error) {
        console.error("Error fetching subscriptions:", error);
    } else {
        const msg = `FOUND ${data.length} SUBSCRIPTIONS`;
        console.log(msg);
        fs.writeFileSync('scripts/debug_output.txt', msg);
    }
}

checkSubs();
