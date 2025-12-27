
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("Checking profiles schema...");
    // Try to select date_of_birth or birth_date generic
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Profile columns:", data && data.length > 0 ? Object.keys(data[0]) : "No profiles found");
    }
}

main();
