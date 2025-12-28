
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // or usage service key if needed

const supabase = createClient(url, key);

async function main() {
    console.log("Checking columns in profiles table...");
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, is_admin, role") // Try selecting potential admin columns
        .limit(1);

    if (error) {
        console.error("Error selecting columns:", error.message);
        if (error.message.includes("does not exist")) {
            console.log("Column likely does not exist.");
        }
    } else {
        console.log("Success! Columns exist.");
        console.log("Sample Data:", data);
    }
}

main();
