
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking keys...");
    const key = "home.features.dashboard.title";

    // Check EN
    const { data: enData, error: enErr } = await supabase
        .from("ui_translations")
        .select("text")
        .eq("key", key)
        .eq("language_code", "en");

    console.log("EN Error:", enErr);
    console.log("EN Value:", enData?.[0]?.text);

    // Check EL
    const { data: elData, error: elErr } = await supabase
        .from("ui_translations")
        .select("text")
        .eq("key", key)
        .eq("language_code", "el");

    console.log("EL Error:", elErr);
    const val = elData?.[0]?.text;
    const isEnglish = val === "Dashboard overview";
    console.log("FINAL_STATUS: " + (isEnglish ? "IS_ENGLISH" : "IS_GREEK (or other)"));
    console.log("VALUE: " + val);
}

check();
