
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Anon access (Frontend simulation)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Checking for 'home.features.dashboard.title' in 'el' using ANON key...");
    const { data, error } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("key", "home.features.dashboard.title")
        .eq("language_code", "el");

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("RESULT: EMPTY_DATA (RLS likely blocking access)");
    } else {
        console.log("RESULT: FOUND_DATA");
        console.log("VALUE:", data[0].text);
    }
}

check();
