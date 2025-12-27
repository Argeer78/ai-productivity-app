
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
    console.log("Checking profiles...");
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, plan");

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${profiles?.length ?? 0} profiles:`);
    profiles?.forEach((p) => {
        console.log(`- ${p.email} (ID: ${p.id}): Plan='${p.plan}'`);
    });
}

main();
