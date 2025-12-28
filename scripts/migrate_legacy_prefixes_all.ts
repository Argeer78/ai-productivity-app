
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
    console.log("Migrating legacy keys to 'notes.' prefix for ALL languages...");

    // Get distinct language codes
    const { data: codes } = await supabase.from("ui_translations").select("language_code");
    const uniqueCodes = Array.from(new Set(codes?.map(c => c.language_code) || []));

    console.log(`Found languages: ${uniqueCodes.join(", ")}`);

    for (const code of uniqueCodes) {
        if (!code) continue;
        console.log(`Processing ${code}...`);

        const { data: allRows } = await supabase
            .from("ui_translations")
            .select("*")
            .eq("language_code", code);

        if (!allRows) continue;

        const keyMap = new Map<string, any>();
        allRows.forEach(r => keyMap.set(r.key, r));
        const upserts: any[] = [];

        for (const row of allRows) {
            if (row.key.startsWith("notes.")) continue;

            let matched = false;
            for (const p of PREFIXES_TO_MIGRATE) {
                if (row.key.startsWith(p) || row.key === p) {
                    matched = true;
                    break;
                }
            }
            if (row.key === "checkingSession") matched = true;

            if (matched) {
                const newKey = "notes." + row.key;

                // If the target key exists, we only overwrite if the request implies we should.
                // But given "Pointing to wrong keys" means Legacy is GOOD, New is BAD (English/Missing).
                // So we always overwrite New with Legacy CONTENT.

                upserts.push({
                    key: newKey,
                    text: row.text, // Copy Content
                    language_code: code,
                    lang: code
                });
            }
        }

        // Attach ID if exists to update
        const finalUpserts = upserts.map(u => {
            const existing = keyMap.get(u.key);
            if (existing) {
                return { ...u, id: existing.id };
            }
            return u;
        });

        if (finalUpserts.length > 0) {
            console.log(`  Migrating ${finalUpserts.length} keys for ${code}...`);
            const batchSize = 100;
            for (let i = 0; i < finalUpserts.length; i += batchSize) {
                const batch = finalUpserts.slice(i, i + batchSize);
                const { error } = await supabase.from("ui_translations").upsert(batch);
                if (error) console.error("  Upsert error:", error.message);
            }
        } else {
            console.log(`  No candidates for ${code}.`);
        }
    }

    console.log("Migration done.");
}

main();
