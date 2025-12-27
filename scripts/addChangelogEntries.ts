import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing env vars. URL:", !!SUPABASE_URL, "KEY:", !!SERVICE_ROLE_KEY);
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const ENTRIES = [
    {
        title: "Gamification: XP & Levels 🚀",
        body: "Stay motivated with our new scaling XP system!\n- Earn XP for completing tasks and notes\n- Track your daily and weekly streaks\n- Unlock new badges and watch your level grow",
        section: "Recent",
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    },
    {
        title: "Visual Polish & 3D Art 🎨",
        body: "We've given the app a major facelift with stunning 3D illustrations, cleaner layouts, and a more vibrant design language across all pages.",
        section: "Recent",
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    },
];

async function run() {
    console.log("Inserting changelog entries...");

    const { data, error } = await supabaseAdmin
        .from("changelog_entries")
        .insert(ENTRIES)
        .select();

    if (error) {
        console.error("Error inserting entries:", error);
        process.exit(1);
    }

    console.log("Success! Inserted:", data.length, "entries.");
}

run();
