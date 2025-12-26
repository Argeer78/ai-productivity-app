import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Helper function to extract translation keys
function extractTranslationKeys(content: string): string[] {
    const regex = /\bt\(["']([^"']+)["']\)/g;
    const keys: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.push(match[1]); // The first capturing group contains the key
    }
    return keys;
}

// Traverse the directory to find all .tsx files and extract keys
function scanTranslationKeys(directory: string): string[] {
    const keys: string[] = [];
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            keys.push(...scanTranslationKeys(fullPath)); // Recurse into directories
        } else if (fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const fileKeys = extractTranslationKeys(content);
            keys.push(...fileKeys);
        }
    });

    return keys;
}

// Function to insert missing keys
async function insertMissingKeys() {
    const directoryPath = './app'; // Your app directory
    const translationKeys = scanTranslationKeys(directoryPath);
    const uniqueTranslationKeys = [...new Set(translationKeys)];

    // Fetch existing keys from the database
    const { data: existingKeys, error: fetchError } = await supabase
        .from("ui_translations")
        .select("key")
        .eq("language_code", "en");

    if (fetchError) {
        console.error("Error fetching existing keys:", fetchError);
        return;
    }

    const existingKeysSet = new Set(existingKeys.map((row) => row.key));

    // Find missing keys
    const missingKeys = uniqueTranslationKeys.filter((key) => !existingKeysSet.has(key));

    if (missingKeys.length > 0) {
        console.log("Found missing keys:", missingKeys);

        // Prepare the insert rows
        const rows = missingKeys.map((key) => ({
            language_code: 'en',
            key,
            text: key, // Fallback to using the key itself as the text
        }));

        // Insert missing keys
        const { error: insertError } = await supabase
            .from("ui_translations")
            .upsert(rows, { onConflict: 'key, language_code' });

        if (insertError) {
            console.error("Error inserting missing keys:", insertError);
        } else {
            console.log(`Inserted ${rows.length} missing keys into 'en' language.`);
        }
    } else {
        console.log("No missing keys found.");
    }
}

// Run the script
insertMissingKeys().catch(console.error);
