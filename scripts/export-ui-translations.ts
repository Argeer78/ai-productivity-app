// scripts/export-ui-translations.ts
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// You need these in your .env.local / env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role or admin key

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Add whatever languages you want to export
const LANGS = [
  "en",
  "el",
  "es",
  "de",
  "fr",
  "it",
  "pt",
  "tr",
  "ru",
  "ro",
  "ar",
  "he",
  "zh",
  "ja",
  "id",
  "sr",
  "bg",
  "hu",
  "pl",
  "cs",
  "da",
  "sv",
  "nb",
  "nl",
];

async function exportLang(lang: string) {
  const { data, error } = await supabase
    .from("ui_translations")
    .select("key, text")
    .eq("language_code", lang)
    .order("key");

  if (error) {
    console.error(`Failed to export ${lang}:`, error.message);
    return;
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (!row.key || typeof row.text !== "string") continue;
    map[row.key] = row.text;
  }

  const outDir = path.join(process.cwd(), "languages");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2), "utf8");

  console.log(`✅ Exported ${Object.keys(map).length} keys to ${outPath}`);
}

async function main() {
  for (const lang of LANGS) {
    await exportLang(lang);
  }
}

main().catch((err) => {
  console.error("Export script error:", err);
  process.exit(1);
});
