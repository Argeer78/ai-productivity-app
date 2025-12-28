
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking exact DB value for auth.login.title...");

    const { data, error } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "en")
        .eq("key", "auth.login.title")
        .maybeSingle();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Row found:", data);
        if (data && data.text === "auth.login.title") {
            console.log("🛑 VALIDATED: The DB contains the key as the text!");
        }
    }
}

main();
