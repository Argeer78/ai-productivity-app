
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Load UI_STRINGS directly (by reading file or mock imports, 
// since we can't easily import TS unless we compile.
// We'll read the file directly!)
import fs from "fs";

// Mock UI String parser
function getUiStrings() {
    const content = fs.readFileSync("lib/uiStrings.ts", "utf8");
    // Regex to find keys. Very rough.
    // export const UI_STRINGS: Record<string, string> = {
    //   "key": "value",
    // ...
    // };
    const matches = content.match(/["']([\w.]+)["']\s*:\s*["'](.+)["']/g);
    const keys = new Set<string>();

    if (matches) {
        matches.forEach(m => {
            const parts = m.split(":");
            const k = parts[0].trim().replace(/['"]/g, "");
            keys.add(k);
        });
    }
    return Array.from(keys);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const expectedKeys = getUiStrings();
    console.log(`Expect ${expectedKeys.length} keys from lib/uiStrings.ts`);

    if (expectedKeys.length === 0) {
        console.error("Failed to parse uiStrings.ts");
        return;
    }

    const { data: dbRows } = await supabase
        .from("ui_translations")
        .select("key")
        .eq("language_code", "en");

    const dbKeys = new Set(dbRows?.map(r => r.key) || []);
    console.log(`Found ${dbKeys.size} keys in DB (en).`);

    const missing = expectedKeys.filter(k => !dbKeys.has(k));
    console.log(`Missing keys: ${missing.length}`);

    if (missing.length > 0) {
        console.log("Samples:", missing.slice(0, 10));
    }
}

main();
