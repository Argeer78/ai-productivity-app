import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, "..");
const SEARCH_DIRS = ["app", "components", "lib", "utils"];
const IGNORE_DIRS = ["node_modules", ".next", ".git"];
const TS_EXTENSIONS = [".ts", ".tsx"];

// Initialize Supabase
const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(
        "Error: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required."
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Store found keys: Map<key, text>
const foundTranslations = new Map<string, string>();

/**
 * Recursively walk directory to find .ts/.tsx files
 */
function getFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);

    for (const file of list) {
        if (IGNORE_DIRS.includes(file)) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            if (TS_EXTENSIONS.includes(path.extname(file))) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

function isStringLiteral(node: ts.Expression): node is ts.StringLiteral {
    return ts.isStringLiteral(node);
}

/**
 * Extract t('key', 'fallback') calls.
 * Detects useT("namespace") and applies it ONLY to non-dotted keys like t("title").
 * If key is already dotted (e.g. "notes.buttons.saveNote"), we DO NOT prefix.
 *
 * IMPORTANT: namespace resets PER FILE, not global.
 */
function extractFromAst(filePath: string) {
    const code = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.Latest,
        true
    );

    // ✅ Reset per file
    let currentNamespace = "";

    function visit(node: ts.Node) {
        // Detect useT("namespace")
        if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && node.expression.text === "useT") {
                const arg0 = node.arguments[0];
                if (arg0 && isStringLiteral(arg0)) {
                    currentNamespace = arg0.text.trim();
                } else {
                    // useT() with no namespace → clear namespace
                    currentNamespace = "";
                }
            }
        }

        // Detect t(...) or translate(...)
        if (ts.isCallExpression(node)) {
            const isT =
                ts.isIdentifier(node.expression) && node.expression.text === "t";
            const isTranslate =
                ts.isIdentifier(node.expression) && node.expression.text === "translate";

            if (isT || isTranslate) {
                const args = node.arguments;
                const arg0 = args[0];

                if (arg0 && isStringLiteral(arg0)) {
                    let key = arg0.text.trim();

                    // ✅ Only prefix if key is NOT already namespaced
                    if (currentNamespace && !key.includes(".")) {
                        key = `${currentNamespace}.${key}`;
                    }

                    let text = key; // default fallback
                    const arg1 = args[1];
                    if (arg1 && isStringLiteral(arg1)) {
                        text = arg1.text;
                    }

                    foundTranslations.set(key, text);
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

/**
 * Fetch existing EN translations from Supabase into a Map<key, text>.
 * Uses pagination with range().
 */
async function fetchExistingEnMap(): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from("ui_translations")
            .select("key,text")
            .eq("language_code", "en")
            .range(from, from + pageSize - 1);

        if (error) throw error;

        const rows = data || [];
        for (const row of rows) out.set(row.key, row.text);

        if (rows.length < pageSize) break;
        from += pageSize;
    }

    return out;
}

function normalizeText(s: string) {
    return (s || "").replace(/\s+/g, " ").trim();
}

async function run() {
    console.log("🔍 Scanning for translation keys using AST...");

    // 1) Collect valid files
    let files: string[] = [];
    for (const dir of SEARCH_DIRS) {
        const fullPath = path.join(PROJECT_ROOT, dir);
        files = files.concat(getFiles(fullPath));
    }

    console.log(`Found ${files.length} TypeScript files to scan.`);

    // 2) Parse each file
    let fileCount = 0;
    for (const file of files) {
        extractFromAst(file);
        fileCount++;
        if (fileCount % 50 === 0) process.stdout.write(".");
    }

    console.log("\nScanning complete.");
    console.log(`Found ${foundTranslations.size} unique keys.`);

    if (foundTranslations.size === 0) {
        console.log("No keys found. Exiting.");
        return;
    }

    // 3) Load existing EN keys from DB
    console.log("📥 Fetching existing EN translations from Supabase...");
    const existing = await fetchExistingEnMap();
    console.log(`Found ${existing.size} EN keys in Supabase.`);

    // 4) Diff (only upsert missing/changed)
    const missing: { key: string; language_code: string; text: string }[] = [];
    const changed: { key: string; language_code: string; text: string }[] = [];
    const unchanged: string[] = [];

    for (const [key, textRaw] of foundTranslations) {
        const text = normalizeText(textRaw);
        const prev = existing.get(key);

        if (prev == null) {
            missing.push({ key, language_code: "en", text });
        } else if (normalizeText(prev) !== text) {
            changed.push({ key, language_code: "en", text });
        } else {
            unchanged.push(key);
        }
    }

    console.log(
        `🧮 Diff: Missing=${missing.length}, Changed=${changed.length}, Unchanged=${unchanged.length}`
    );

    const toUpsert = [...missing, ...changed];

    if (toUpsert.length === 0) {
        console.log("✅ Nothing to upsert. You are fully synced.");
        return;
    }

    console.log("📝 Syncing to Supabase (upserting only missing/changed EN)...");

    // 5) Batch upsert
    const BATCH_SIZE = 200;
    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
        const batch = toUpsert.slice(i, i + BATCH_SIZE);

        const { error } = await supabase
            .from("ui_translations")
            .upsert(batch, { onConflict: "language_code,key" });

        if (error) {
            console.error("Error upserting batch:", error);
            fs.writeFileSync(
                "scripts/sync_error.txt",
                JSON.stringify(error, null, 2)
            );
            failCount += batch.length;
        } else {
            okCount += batch.length;
        }
    }

    console.log("✅ Sync complete.");
    console.log(`   - Upserted (missing+changed): ${okCount}`);
    console.log(`   - Failed: ${failCount}`);
}

run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
