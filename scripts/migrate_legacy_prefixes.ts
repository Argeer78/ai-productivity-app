
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PREFIXES_TO_MIGRATE = [
    "buttons.",
    "category.",
    "list.",
    "create.",
    "form.",
    "plan.",
    "voice.",
    "tasks.",
    "sort.",
    "errors.",
    "confirm.",
    "usage.",
    "share.",
    "checkingSession"
];

async function main() {
    console.log("Migrating legacy keys to 'notes.' prefix for 'el'...");

    // Fetch ALL keys for EL
    const { data: allRows } = await supabase
        .from("ui_translations")
        .select("*")
        .eq("language_code", "el");

    if (!allRows) return;

    // Map existing keys
    const keyMap = new Map<string, any>();
    allRows.forEach(r => keyMap.set(r.key, r));

    const upserts: any[] = [];

    // Scan for legacy keys
    for (const row of allRows) {
        // If row is e.g. "buttons.saveNote"
        // We want "notes.buttons.saveNote"

        // Skip if already starts with notes.
        if (row.key.startsWith("notes.")) continue;

        let matched = false;
        // Check if it starts with one of our target prefixes
        for (const p of PREFIXES_TO_MIGRATE) {
            if (row.key.startsWith(p) || row.key === p) {
                matched = true;
                break;
            }
        }

        // Also handling direct exact matches e.g. "checkingSession"
        if (row.key === "checkingSession") matched = true;

        if (matched) {
            const newKey = "notes." + row.key;

            // If newKey doesn't exist, OR if newKey exists but is English (heuristic?)
            // We'll perform Upsert.
            // But we need to be careful not to overwrite Good Data with Bad Data.
            // Assumption: The Legacy key (without prefix) holds the GOOD Greek translation.
            // The New key (with prefix) is either missing, or I just inserted it as English fallback.

            // So we overwrite notes.K with content of K.

            upserts.push({
                key: newKey,
                text: row.text, // The Greek content
                language_code: "el",
                lang: "el"
                // id? If we include ID we update. If not, we insert.
                // We should find the ID of the target if it exists to Update it.
            });
        }
    }

    console.log(`Found ${upserts.length} candidates for migration.`);

    // De-dupe upserts (if logic produced dupes, unlikely)

    // Need to attach IDs for Updates to avoid Unique Key violation if row exists
    // (ui_translations typically has unique constraint on key+language_code)

    const finalUpserts = upserts.map(u => {
        const existing = keyMap.get(u.key);
        if (existing) {
            return { ...u, id: existing.id };
        }
        return u;
    });

    if (finalUpserts.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < finalUpserts.length; i += batchSize) {
            const batch = finalUpserts.slice(i, i + batchSize);
            console.log(`Upserting batch ${i} (${batch.length})...`);
            const { error } = await supabase.from("ui_translations").upsert(batch);
            if (error) console.error("Upsert error:", error);
        }
        console.log("Migration done.");
    }
}

main();
