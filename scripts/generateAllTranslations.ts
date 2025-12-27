
import { execSync } from "child_process";

const LANGUAGES = [
    "de", "es", "fr", "it", "pt", "el", "tr", "ru", "ro", "ar", "he",
    "zh", "ja", "id", "hi", "ko", "sr", "bg", "hu", "pl", "cs", "da",
    "sv", "nb", "nl"
];

// Note: "en" is the source, so we skip it.

console.log(`🚀 Starting batch translation generation for ${LANGUAGES.length} languages...`);

for (const lang of LANGUAGES) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`🌍 Generating for: ${lang.toUpperCase()}`);
    console.log(`---------------------------------------------------------`);

    try {
        // Run the existing generation script per language
        execSync(`npx tsx scripts/generateTranslations.ts ${lang}`, { stdio: "inherit" });
    } catch (err) {
        console.error(`❌ Failed to generate for ${lang}`, err);
        // Continue to next language instead of crashing
    }
}

console.log("\n✅ Batch generation complete!");
